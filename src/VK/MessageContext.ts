import axios from "axios";
import {
    APIError,
    DocumentAttachment,
    Keyboard,
    KeyboardBuilder,
    MessageContext as VKIOMessageContext,
    MessageEventContext,
    VK,
} from "vk-io";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { TranslateFunction } from "../ILocalisator";
import { UserError } from "../UserError";
import { BaseMessageContext, MessageContextStorage } from "../core/BaseMessageContext";
import { FluentLocalizer } from "../core/FluentLocalizer";
import { MessageNotModifiedError, ReplyToMessage, SendOptions, TextLinkEntity } from "../core/MessageContext";
import { Language } from "../core/Settings";
import { IKeyboard } from "../Util";
import { uploadMessagePhoto, uploadPrivateVideo } from "./Upload";

const VK_CHAT_PEER_OFFSET = 2_000_000_000;
const MAX_REPLAY_FILE_SIZE = 5 * 1024 * 1024;

type IncomingVKContext = VKIOMessageContext | MessageEventContext;

interface VKUserProfile {
    id: number;
    first_name: string;
    last_name: string;
    screen_name?: string;
}

interface PreparedMessage {
    text: string;
    attachment?: string;
}

interface VKMessageAttachment {
    type: string;
    [key: string]: unknown;
}

function isMessageContext(context: IncomingVKContext): context is VKIOMessageContext {
    return context.type === "message";
}

function payloadCommand(payload: unknown): string | undefined {
    if (typeof payload === "string") {
        try {
            return payloadCommand(JSON.parse(payload));
        } catch {
            return payload;
        }
    }
    if (payload && typeof payload === "object" && "command" in payload) {
        const command = (payload as { command?: unknown }).command;
        return typeof command === "string" ? command : undefined;
    }
    return undefined;
}

function replyMessage(context: VKIOMessageContext | undefined): ReplyToMessage | undefined {
    const reply = context?.replyMessage ?? context?.forwards?.[0];
    if (!reply) {
        return undefined;
    }
    return {
        text: reply.text ?? "",
        externalSenderId: reply.senderId,
        externalChatId: reply.peerId || context.peerId,
    };
}

function vkLanguage(context: VKIOMessageContext | undefined): Language | undefined {
    if (!context) {
        return undefined;
    }
    return context.clientInfo?.lang_id === 0 ? "ru" : "en";
}

function attachmentReference(attachment: VKMessageAttachment): string | undefined {
    const value = attachment[attachment.type];
    if (!value || typeof value !== "object") {
        return undefined;
    }
    const item = value as { id?: unknown; owner_id?: unknown; access_key?: unknown };
    if (
        (typeof item.id !== "number" && typeof item.id !== "string") ||
        (typeof item.owner_id !== "number" && typeof item.owner_id !== "string")
    ) {
        return undefined;
    }
    const accessKey = typeof item.access_key === "string" && item.access_key ? `_${item.access_key}` : "";
    return `${attachment.type}${item.owner_id}_${item.id}${accessKey}`;
}

export class VKMessageContext extends BaseMessageContext {
    private readonly messageContext?: VKIOMessageContext;
    private readonly eventContext?: MessageEventContext;
    private userProfile?: VKUserProfile;
    private userInfoUpdated = false;
    private callbackAnswered = false;

    constructor(
        private readonly context: IncomingVKContext,
        private readonly vk: VK,
        private readonly groupId: number,
        ownerId: number,
        storage: MessageContextStorage,
        private readonly localizer: FluentLocalizer,
        private readonly userVk?: VK
    ) {
        const message = isMessageContext(context) ? context : undefined;
        const event = message ? undefined : (context as MessageEventContext);
        const externalSenderId = message?.senderId ?? event.userId;
        const externalChatId = message?.peerId ?? event.peerId;
        super(
            {
                platform: "vk",
                externalSenderId,
                externalChatId,
                ownerId,
                plainText: message?.text,
                plainPayload: payloadCommand(message?.messagePayload ?? event?.eventPayload),
                replyMessage: replyMessage(message),
                isInGroupChat: externalChatId >= VK_CHAT_PEER_OFFSET,
                defaultLanguage: vkLanguage(message),
            },
            storage
        );
        this.messageContext = message;
        this.eventContext = event;
    }

    protected async createTranslate(language?: Language): Promise<TranslateFunction> {
        return this.localizer.translator(language, {
            first_name: this.userProfile?.first_name ?? "",
            last_name: this.userProfile?.last_name ?? "",
            user_mention: this.profileMention(),
        });
    }

    async ensureUserInfoUpdated(): Promise<void> {
        if (this.userInfoUpdated) {
            return;
        }

        const profiles = await this.vk.api.users.get({
            user_ids: [this.externalSenderId as number],
            fields: ["screen_name"],
        });
        this.userProfile = profiles[0] as VKUserProfile | undefined;
        if (this.userProfile) {
            await this.storage.userDirectory.set({
                account_id: this.senderId,
                display_username: this.userProfile.screen_name ?? null,
                first_name: this.userProfile.first_name ?? null,
                last_name: this.userProfile.last_name ?? null,
            });
        }
        this.userInfoUpdated = true;
    }

    async reply(text: string, options?: SendOptions): Promise<unknown> {
        if (this.messageContext) {
            return await this.send(text, options, this.messageContext.id);
        }
        return await this.send(`${this.profileMention()},\n${text}`, options);
    }

    async send(text: string, options?: SendOptions, replyTo?: number): Promise<unknown> {
        const [keyboard, prepared] = await Promise.all([
            this.createKeyboard(options?.keyboard),
            this.prepareMessage(text, options),
        ]);
        return await this.context.send({
            message: prepared.text,
            attachment: prepared.attachment,
            keyboard,
            reply_to: replyTo,
            dont_parse_links: options?.dont_parse_links === false ? 0 : 1,
        });
    }

    async remove(): Promise<void> {
        if (!this.eventContext || !this.messagePayload) {
            return;
        }
        try {
            await this.vk.api.messages.delete({
                peer_id: this.eventContext.peerId,
                cmids: this.eventContext.conversationMessageId,
                delete_for_all: 1,
            });
        } catch (error) {
            global.logger.error("Failed to remove VK message", error);
        }
    }

    async edit(text: string, options?: SendOptions): Promise<void> {
        if (!this.eventContext || !this.messagePayload) {
            return;
        }

        const [keyboard, prepared] = await Promise.all([
            this.createKeyboard(options?.keyboard),
            this.prepareMessage(text, options),
        ]);
        try {
            await this.vk.api.messages.edit({
                peer_id: this.eventContext.peerId,
                cmid: this.eventContext.conversationMessageId,
                message: prepared.text,
                attachment: prepared.attachment,
                keyboard,
                dont_parse_links: options?.dont_parse_links === false ? 0 : 1,
            });
        } catch (error) {
            if (error instanceof APIError && /not modified/i.test(error.message)) {
                throw new MessageNotModifiedError();
            }
            throw error;
        }
    }

    async editMarkup(keyboard: IKeyboard): Promise<unknown> {
        if (!this.eventContext || !this.messagePayload) {
            return undefined;
        }
        const vkKeyboard = await this.createKeyboard(keyboard);
        if (!vkKeyboard) {
            return undefined;
        }
        const current = await this.vk.api.messages.getByConversationMessageId({
            peer_id: this.eventContext.peerId,
            conversation_message_ids: this.eventContext.conversationMessageId,
            group_id: this.groupId,
        });
        const message = current.items[0];
        if (!message) {
            throw new Error("VK message to edit was not found");
        }
        const attachment = (message.attachments ?? [])
            .map((item) => attachmentReference(item as VKMessageAttachment))
            .filter((item): item is string => Boolean(item))
            .join(",");
        return await this.vk.api.messages.edit({
            peer_id: this.eventContext.peerId,
            cmid: this.eventContext.conversationMessageId,
            message: message.text || (attachment ? undefined : "\u2060"),
            attachment: attachment || undefined,
            keyboard: vkKeyboard,
        });
    }

    async answer(text: string): Promise<true | void> {
        if (!this.eventContext || !this.messagePayload) {
            return undefined;
        }
        await this.eventContext.answer({ type: "show_snackbar", text });
        this.callbackAnswered = true;
        return true;
    }

    async acknowledge(): Promise<void> {
        if (!this.eventContext || this.callbackAnswered) {
            return;
        }
        await this.vk.api.messages.sendMessageEventAnswer({
            event_id: this.eventContext.eventId,
            user_id: this.eventContext.userId,
            peer_id: this.eventContext.peerId,
        });
        this.callbackAnswered = true;
    }

    async isUserAdmin(accountId: number): Promise<boolean> {
        const externalUserId = await this.getExternalUserId(accountId);
        if (externalUserId === undefined || !this.isInGroupChat) {
            return false;
        }
        const members = await this.getConversationMembers(Number(this.externalChatId));
        const member = members.items.find((item) => item.member_id === externalUserId);
        return Boolean(member?.is_admin || member?.is_owner);
    }

    async isSenderAdmin(): Promise<boolean> {
        if (!this.isInGroupChat) {
            return false;
        }
        const members = await this.getConversationMembers(Number(this.externalChatId));
        const member = members.items.find((item) => item.member_id === Number(this.externalSenderId));
        return Boolean(member?.is_admin || member?.is_owner);
    }

    async isBotAdmin(): Promise<boolean> {
        if (!this.isInGroupChat) {
            return false;
        }
        try {
            await this.getConversationMembers(Number(this.externalChatId));
            return true;
        } catch {
            return false;
        }
    }

    async isUserInChat(accountId: number, chatId?: number): Promise<boolean> {
        const [externalUserId, externalChatId] = await Promise.all([
            this.getExternalUserId(accountId),
            chatId === undefined ? Promise.resolve(this.externalChatId) : this.getExternalChatId(chatId),
        ]);
        const peerId = Number(externalChatId);
        if (externalUserId === undefined || !Number.isSafeInteger(peerId)) {
            return false;
        }
        if (peerId < VK_CHAT_PEER_OFFSET) {
            return peerId === externalUserId;
        }
        try {
            const members = await this.getConversationMembers(peerId);
            return members.items.some((item) => item.member_id === externalUserId);
        } catch {
            return false;
        }
    }

    async isChatValid(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        const peerId = Number(externalChatId);
        if (!Number.isSafeInteger(peerId)) {
            return false;
        }
        try {
            const result = await this.vk.api.messages.getConversationsById({
                peer_ids: peerId,
                group_id: this.groupId,
            });
            return result.count > 0;
        } catch {
            return false;
        }
    }

    async isBotInChat(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        const peerId = Number(externalChatId);
        if (!Number.isSafeInteger(peerId)) {
            return false;
        }
        if (peerId < VK_CHAT_PEER_OFFSET) {
            return await this.isChatValid(chatId);
        }
        try {
            const members = await this.getConversationMembers(peerId);
            return members.items.some((item) => item.member_id === -this.groupId);
        } catch {
            return false;
        }
    }

    async mentionUser(accountId: number): Promise<string> {
        const externalUserId = await this.getExternalUserId(accountId);
        if (externalUserId === undefined) {
            return String(accountId);
        }
        const info = await this.storage.userDirectory.get(accountId);
        const displayName = [info?.first_name, info?.last_name].filter(Boolean).join(" ");
        if (displayName) {
            return `[id${externalUserId}|${displayName}]`;
        }
        const profiles = await this.vk.api.users.get({ user_ids: [externalUserId] });
        const profile = profiles[0];
        const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : `id${externalUserId}`;
        return `[id${externalUserId}|${name}]`;
    }

    async chatMembersCount(): Promise<number> {
        if (!this.isInGroupChat) {
            return 1;
        }
        return (await this.getConversationMembers(Number(this.externalChatId))).count;
    }

    hasLinks(): boolean {
        return this.getLinks().length > 0;
    }

    getLinks(): TextLinkEntity[] {
        const links: TextLinkEntity[] = [];
        for (const attachment of this.messageContext?.getAttachments("link") ?? []) {
            links.push({ type: "text_link", offset: 0, length: 0, url: attachment.url });
        }

        const text = this.plainText ?? "";
        for (const match of text.matchAll(/https?:\/\/[^\s]+/gi)) {
            const rawUrl = match[0];
            const url = rawUrl.replace(/[),.!?]+$/, "");
            links.push({
                type: "text_link",
                offset: match.index ?? 0,
                length: url.length,
                url,
            });
        }
        return links;
    }

    hasFile(): boolean {
        return this.documents.length > 0;
    }

    getFileName(): string {
        return this.document?.title;
    }

    getFileSize(): number {
        return this.document?.size ?? Number.MAX_VALUE;
    }

    async downloadFile(): Promise<string> {
        if (this.tmpFile) {
            return this.tmpFile;
        }
        const document = this.document;
        if (!document?.url) {
            throw new Error("VK document URL is unavailable");
        }

        const extension = document.extension?.replace(/[^a-z0-9]/gi, "").slice(0, 12);
        const filePath = path.join(os.tmpdir(), `osubot-vk-${randomUUID()}${extension ? `.${extension}` : ""}`);
        const response = await axios.get<ArrayBuffer>(document.url, {
            responseType: "arraybuffer",
            maxContentLength: MAX_REPLAY_FILE_SIZE,
            maxBodyLength: MAX_REPLAY_FILE_SIZE,
        });
        await fs.writeFile(filePath, Buffer.from(response.data));
        this.tmpFile = filePath;
        this.registerTempFile(filePath);
        return filePath;
    }

    private get documents(): DocumentAttachment[] {
        return this.messageContext?.getAttachments("doc") ?? [];
    }

    private get document(): DocumentAttachment | undefined {
        return this.documents[0];
    }

    private async createKeyboard(rows?: IKeyboard): Promise<KeyboardBuilder | undefined> {
        if (!rows?.length) {
            return undefined;
        }
        const keyboard = Keyboard.builder().inline();
        for (const row of rows) {
            for (const button of row) {
                keyboard.callbackButton({
                    label: button.text.slice(0, 40),
                    payload: { command: await this.prepareButtonPayload(button.command) },
                });
            }
            keyboard.row();
        }
        return keyboard;
    }

    private async prepareMessage(text: string, options?: SendOptions): Promise<PreparedMessage> {
        if (options?.photo) {
            const attachment = Buffer.isBuffer(options.photo)
                ? (await uploadMessagePhoto(this.vk, Number(this.externalChatId), options.photo)).toString()
                : options.photo;
            return { text, attachment: attachment || undefined };
        }

        if (options?.video) {
            if (!this.userVk) {
                global.logger.error("VK video upload is not configured: VK_USER_TOKEN is missing");
                throw new UserError("video-send-failed", "VK_USER_TOKEN is not configured");
            }
            try {
                const video = await uploadPrivateVideo(this.userVk, options.video.url, options.video.title);
                return { text, attachment: video.toString() };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                global.logger.error(`Failed to upload video to VK: ${message}`);
                throw new UserError("video-send-failed", "Failed to upload video to VK");
            }
        }

        return { text };
    }

    private async getConversationMembers(peerId: number) {
        return await this.vk.api.messages.getConversationMembers({
            peer_id: peerId,
            group_id: this.groupId,
        });
    }

    private profileMention(): string {
        const name = this.userProfile?.first_name || `id${this.externalSenderId}`;
        return `[id${this.externalSenderId}|${name}]`;
    }
}
