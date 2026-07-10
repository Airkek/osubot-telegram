import { Api, Context, GrammyError, InlineKeyboard, InputFile, InputMediaBuilder } from "grammy";
import { UserFromGetMe } from "@grammyjs/types";
import { FileApiFlavor, FileFlavor } from "@grammyjs/files";
import { I18nFlavor } from "@grammyjs/i18n";
import fs from "fs/promises";
import { TranslateFunction, TranslationVariables } from "../ILocalisator";
import { ApplicationStorage, ControllableFeature } from "../core/ApplicationStorage";
import { ChatSettings, Language, UserSettings } from "../core/Settings";
import { IKeyboard } from "../Util";
import Util from "../Util";
import {
    IMessageContext,
    MessageNotModifiedError,
    ReplyToMessage,
    SendOptions,
    TextLinkEntity,
} from "../core/MessageContext";
import { MessageIdentity } from "../core/Identity";

export type TgContext = FileFlavor<Context & I18nFlavor>;
export type TgApi = FileApiFlavor<Api>;

type TelegramContextStorage = Pick<
    ApplicationStorage,
    "identities" | "userDirectory" | "featureFlags" | "userSettings" | "chatSettings"
>;

const registry = new FinalizationRegistry(async (path: string) => {
    if (!(await Util.fileExists(path))) {
        return;
    }
    global.logger.warn(`Removing file ${path} after destructing object`);
    try {
        await fs.rm(path);
    } catch {
        global.logger.fatal(`Failed to remove file: ${path}`);
    }
});

export class TelegramMessageContext implements IMessageContext {
    readonly platform = "telegram" as const;
    readonly externalChatId: number;
    readonly externalSenderId: number;
    chatId: number;
    senderId: number;
    userId: number;

    readonly plainText?: string;
    readonly plainPayload?: string;

    readonly replyMessage?: ReplyToMessage;

    readonly isInGroupChat: boolean;

    private readonly tgCtx: TgContext;
    private readonly me: UserFromGetMe;
    private readonly localServer: boolean;
    private readonly storage: TelegramContextStorage;

    private tmpFile?: string;
    private registryToken?: object;

    private userSettingsCache: UserSettings;
    private chatSettingsCache: ChatSettings;

    private isLocalisatorActivated: boolean = false;
    private language: Language = undefined;
    internalTranslate: TranslateFunction = undefined;

    tr(key: string, vars?: TranslationVariables) {
        if (this.isLocalisatorActivated) {
            return this.internalTranslate(key, vars);
        }

        return `Error: Translation context is not activated. Please, report this to developer. Translation key: '${key}'.`;
    }

    private readonly ownerId: number;
    get isFromOwner(): boolean {
        return this.externalSenderId == this.ownerId;
    }

    private graphicalModeOverride: "no" | "cards" | "plain" = "no";

    private convertReplyMessage(ctx: TgContext): ReplyToMessage {
        if (!ctx.message?.reply_to_message) {
            return undefined;
        }

        const reply = ctx.message.reply_to_message;
        if (reply.forum_topic_created || reply.forum_topic_closed || reply.forum_topic_reopened) {
            return undefined;
        }

        // Ignore replies to channel messages (e.g., in comment threads)
        // Channel messages have sender_chat instead of from
        if (reply.sender_chat || !reply.from) {
            return undefined;
        }

        return {
            text: reply.text ?? reply.caption ?? "",
            externalSenderId: reply.from.id,
            externalChatId: reply.chat.id,
        };
    }

    constructor(ctx: TgContext, ownerId: number, me: UserFromGetMe, isLocal: boolean, storage: TelegramContextStorage) {
        this.tgCtx = ctx;
        this.me = me;
        this.localServer = isLocal;
        this.storage = storage;

        this.plainText = ctx.message?.text ?? ctx.message?.caption;
        this.plainPayload = ctx.callbackQuery?.data;
        this.replyMessage = this.convertReplyMessage(ctx);
        this.isInGroupChat = ctx.chat.type == "supergroup" || ctx.chat.type == "group";
        this.externalSenderId = ctx.from.id;
        this.externalChatId = ctx.chatId;
        this.ownerId = ownerId;

        this.parsePayload();
    }

    bindIdentity(identity: MessageIdentity): void {
        this.userId = identity.user.userId;
        this.senderId = identity.user.accountId;
        this.chatId = identity.chat.chatId;
        if (this.replyMessage) {
            this.replyMessage.chatId = identity.chat.chatId;
            this.replyMessage.senderId = identity.replyUser?.accountId;
            this.replyMessage.userId = identity.replyUser?.userId;
        }
    }

    private overridenText: string = undefined;
    get text(): string {
        return this.overridenText ?? this.plainText;
    }

    private overridenPayload: string = undefined;
    get messagePayload(): string {
        return this.overridenPayload ?? this.plainPayload;
    }

    applyTextOverrides(aliases: Record<string, string>) {
        const text = this.text;
        if (!text) {
            return;
        }
        const lowerText = text.toLowerCase();
        for (const [alias, command] of Object.entries(aliases)) {
            const lowerOverride = alias.toLowerCase();

            if (lowerText.startsWith(lowerOverride)) {
                if (text.length === alias.length || /^\s$/.test(text.charAt(alias.length))) {
                    this.overridenText = (command + " " + text.slice(alias.length).trim()).trim();
                    return;
                }
            }
        }
    }

    private parsePayload() {
        if (!this.plainPayload?.startsWith("^")) {
            return;
        }

        const payloadSplit = this.plainPayload.slice(1).split("^");
        if (payloadSplit.length < 2) {
            this.overridenPayload = payloadSplit[0];
            return;
        }

        //g1^payload payload payload (this payload too!! ->> ^ <<- payload!!!)
        const payload = [];
        let argsEnded = false;
        for (const string of payloadSplit) {
            if (!argsEnded) {
                if (string.startsWith("g") && string.length == 2) {
                    const mode = Number(string.slice(1));
                    if (mode == 1) {
                        this.graphicalModeOverride = "plain";
                    } else if (mode == 2) {
                        this.graphicalModeOverride = "cards";
                    }
                } else {
                    argsEnded = true;
                }
            }

            if (argsEnded) {
                payload.push(string);
            }
        }

        this.overridenPayload = payload.join("^");
    }

    private async prepareButtonPayloadPrefix(): Promise<string> {
        const ctxData = [];
        if (await this.preferCardsOutput()) {
            ctxData.push("g2");
        } else {
            ctxData.push("g1");
        }

        return "^" + ctxData.join("^") + "^";
    }

    private async createKeyboard(rows: IKeyboard): Promise<InlineKeyboard> {
        if (!rows || rows.length == 0) {
            return undefined;
        }

        const payloadPrefix = await this.prepareButtonPayloadPrefix();
        const buttonRows = rows.map((row) =>
            row.map((button) => InlineKeyboard.text(button.text, payloadPrefix + button.command))
        );
        return InlineKeyboard.from(buttonRows);
    }

    private userInfoUpdated: boolean = false;
    async ensureUserInfoUpdated() {
        if (this.userInfoUpdated) {
            return;
        }

        if (this.tgCtx.from && !this.tgCtx.from.is_bot) {
            await this.storage.userDirectory.set({
                account_id: this.senderId,
                display_username: this.tgCtx.from.username ?? null,
                first_name: this.tgCtx.from.first_name ?? null,
                last_name: this.tgCtx.from.last_name ?? null,
            });
        }

        this.userInfoUpdated = true;
    }

    async activateLocalisator() {
        if (this.isLocalisatorActivated) {
            return;
        }

        if (this.isInGroupChat) {
            const chatSettings = await this.chatSettings();
            if (chatSettings.language_override != "do_not_override") {
                this.language = chatSettings.language_override;
            }
        }

        if (!this.language) {
            const userSettings = await this.userSettings();
            if (userSettings.language_override != "do_not_override") {
                this.language = userSettings.language_override;
            }
        }

        if (this.language) {
            this.tgCtx.i18n.useLocale(this.language);
        }

        this.internalTranslate = this.tgCtx.translate;
        this.isLocalisatorActivated = true;
    }

    async reactivateLocalisator() {
        this.isLocalisatorActivated = false;
        this.language = undefined;
        await this.activateLocalisator();
    }

    public async checkFeature(feature: ControllableFeature) {
        if (this.isFromOwner) {
            const allFeatures = await this.storage.featureFlags.isFeatureEnabled("admin-all-features");
            if (allFeatures) {
                return true;
            }
        }

        return await this.storage.featureFlags.isFeatureEnabled(feature);
    }

    async preferCardsOutput(): Promise<boolean> {
        const cardsEnabled = await this.checkFeature("oki-cards");
        if (!cardsEnabled) {
            return false;
        }

        if (this.graphicalModeOverride != "no") {
            return this.graphicalModeOverride == "cards";
        }

        const settings = await this.userSettings();
        return settings.content_output == "oki-cards";
    }

    async userSettings(forceUpdate: boolean = false): Promise<UserSettings> {
        if (forceUpdate || !this.userSettingsCache) {
            this.userSettingsCache = await this.storage.userSettings.getUserSettings(this.userId, this.senderId);
        }

        return this.userSettingsCache;
    }

    async chatSettings(forceUpdate: boolean = false): Promise<ChatSettings> {
        if (!this.isInGroupChat) {
            return undefined;
        }

        if (forceUpdate || !this.chatSettingsCache) {
            this.chatSettingsCache = await this.storage.chatSettings.getChatSettings(this.chatId);
        }

        return this.chatSettingsCache;
    }

    async updateUserSettings(settings: UserSettings) {
        if (settings.user_id != this.userId || settings.account_id != this.senderId) {
            return;
        }
        await this.storage.userSettings.updateSettings(settings);
        this.userSettingsCache = settings;
    }

    async updateChatSettings(settings: ChatSettings) {
        if (!this.isInGroupChat || settings.chat_id != this.chatId) {
            return;
        }
        await this.storage.chatSettings.updateSettings(settings);
        this.chatSettingsCache = settings;
    }

    async reply(text: string, options?: SendOptions) {
        const callbackReplyTo = this.tgCtx.callbackQuery?.from.username
            ? `@${this.tgCtx.callbackQuery.from.username}`
            : this.tgCtx.callbackQuery?.from.first_name;

        const isMessage = this.tgCtx.message !== undefined;
        return await this.send(
            isMessage ? text : `${callbackReplyTo},\n${text}`,
            options,
            isMessage ? this.tgCtx.message.message_id : undefined
        );
    }

    async send(text: string, options?: SendOptions, replyTo?: number) {
        const keyboard = await this.createKeyboard(options?.keyboard);
        if (options?.photo) {
            const photo = Buffer.isBuffer(options.photo) ? new InputFile(options.photo) : options.photo;
            return await this.tgCtx.replyWithPhoto(photo, {
                caption: text,
                reply_parameters: {
                    message_id: replyTo,
                },
                reply_markup: keyboard,
            });
        }

        if (options?.video) {
            return await this.tgCtx.replyWithVideo(new InputFile(new URL(options.video.url)), {
                width: options.video.width,
                height: options.video.height,
                duration: options.video.duration,
                supports_streaming: true,
                caption: text,
                reply_parameters: {
                    message_id: replyTo,
                },
                reply_markup: keyboard,
            });
        }

        return await this.tgCtx.reply(text, {
            link_preview_options: {
                is_disabled: options?.dont_parse_links !== false,
            },
            reply_parameters: {
                message_id: replyTo,
            },
            reply_markup: keyboard,
        });
    }

    async remove() {
        if (!this.messagePayload) {
            return undefined;
        }
        try {
            await this.tgCtx.deleteMessage();
        } catch (e) {
            global.logger.error(e);
            return undefined;
        }
    }

    async edit(text: string, options?: SendOptions): Promise<void> {
        if (!this.messagePayload) {
            return;
        }

        const keyboard = await this.createKeyboard(options?.keyboard);
        const hasMedia = options?.photo || options?.video || this.tgCtx.message?.photo || this.tgCtx.message?.video;
        try {
            if (hasMedia) {
                if (options?.photo) {
                    const photo = Buffer.isBuffer(options.photo) ? new InputFile(options.photo) : options.photo;
                    await this.tgCtx.editMessageMedia(InputMediaBuilder.photo(photo), {
                        reply_markup: keyboard,
                    });
                } else if (options?.video) {
                    // TODO: support both
                    const video = InputMediaBuilder.video(new InputFile(new URL(options.video.url)), {
                        width: options.video.width,
                        height: options.video.height,
                        duration: options.video.duration,
                        supports_streaming: true,
                        caption: text,
                    });
                    await this.tgCtx.editMessageMedia(video, {
                        reply_markup: keyboard,
                    });
                }
                await this.tgCtx.editMessageCaption({
                    reply_markup: keyboard,
                    caption: text,
                });
            } else if (text != this.text) {
                await this.tgCtx.editMessageText(text, {
                    link_preview_options: {
                        is_disabled: options?.dont_parse_links !== false,
                    },
                    reply_markup: keyboard,
                });
            } else if (options?.keyboard) {
                await this.tgCtx.editMessageReplyMarkup({
                    reply_markup: keyboard,
                });
            }
        } catch (error) {
            if (error instanceof GrammyError && error.message.includes("message is not modified")) {
                throw new MessageNotModifiedError();
            }
            throw error;
        }
    }

    async editMarkup(keyboard: IKeyboard) {
        if (!this.messagePayload) {
            return undefined;
        }
        const kb = await this.createKeyboard(keyboard);
        if (!kb) {
            return undefined;
        }
        return await this.tgCtx.editMessageReplyMarkup({
            reply_markup: kb,
        });
    }

    async answer(text: string): Promise<true> {
        if (!this.messagePayload) {
            return;
        }
        return await this.tgCtx.answerCallbackQuery(text);
    }

    async isUserAdmin(accountId: number): Promise<boolean> {
        const externalUserId = await this.getExternalUserId(accountId);
        if (externalUserId === undefined) {
            return false;
        }
        return this.isExternalUserAdmin(externalUserId);
    }

    private async isExternalUserAdmin(userId: number): Promise<boolean> {
        try {
            const res = await this.tgCtx.api.getChatMember(this.externalChatId, userId);
            return res.status == "creator" || res.status == "administrator";
        } catch (e) {
            if (e.message.includes("CHAT_ADMIN_REQUIRED")) {
                return false;
            }

            throw e;
        }
    }

    async isSenderAdmin(): Promise<boolean> {
        return this.isExternalUserAdmin(this.externalSenderId);
    }

    async isBotAdmin(): Promise<boolean> {
        return this.isExternalUserAdmin(this.me.id);
    }

    async isUserInChat(accountId: number, chatId?: number): Promise<boolean> {
        const [externalUserId, externalChatId] = await Promise.all([
            this.getExternalUserId(accountId),
            chatId === undefined ? Promise.resolve(this.externalChatId) : this.getExternalChatId(chatId),
        ]);
        if (externalUserId === undefined || externalChatId === undefined) {
            return false;
        }
        try {
            if (chatId) {
                const isValid = await this.isChatValid(chatId);
                if (!isValid) {
                    return false;
                }
            }

            const user = await this.tgCtx.api.getChatMember(externalChatId, externalUserId);
            return user && user.status != "kicked" && user.status != "left";
        } catch (e) {
            return !e.description?.includes("member not found");
        }
    }

    async isChatValid(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        if (externalChatId === undefined) {
            return false;
        }
        try {
            const chatInfo = await this.tgCtx.api.getChat(externalChatId);
            return !!chatInfo;
        } catch (e) {
            return !e.description?.includes("chat not found");
        }
    }

    async isBotInChat(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        if (externalChatId === undefined || !(await this.isChatValid(chatId))) {
            return false;
        }
        try {
            const user = await this.tgCtx.api.getChatMember(externalChatId, this.me.id);
            return user && user.status != "kicked" && user.status != "left";
        } catch (e) {
            return !e.description?.includes("member not found");
        }
    }

    async mentionUser(accountId: number): Promise<string> {
        const info = await this.storage.userDirectory.get(accountId);
        if (info?.display_username) {
            return `@${info.display_username}`;
        }
        const externalUserId = await this.getExternalUserId(accountId);
        return externalUserId === undefined ? String(accountId) : `tg://user?id=${externalUserId}`;
    }

    chatMembersCount(): Promise<number> {
        return this.tgCtx.api.getChatMemberCount(this.externalChatId);
    }

    private async getExternalUserId(accountId: number): Promise<number | undefined> {
        const identity = await this.storage.identities.getUser(accountId);
        if (!identity) {
            return undefined;
        }
        const id = Number(identity.externalId);
        return Number.isSafeInteger(id) ? id : undefined;
    }

    private async getExternalChatId(chatId: number): Promise<number | string | undefined> {
        if (chatId === this.chatId) {
            return this.externalChatId;
        }
        const identity = await this.storage.identities.getChat(chatId);
        return identity?.externalId;
    }

    hasLinks(): boolean {
        return this.tgCtx.message?.entities?.some((entity) => entity.type === "text_link");
    }

    getLinks(): TextLinkEntity[] {
        return this.tgCtx.message?.entities?.filter((entity) => entity.type === "text_link") as TextLinkEntity[];
    }

    hasFile(): boolean {
        return !!this.tgCtx.message?.document;
    }

    getFileName(): string {
        return this.tgCtx.message?.document?.file_name;
    }

    getFileSize(): number {
        return this.tgCtx.message?.document?.file_size ?? Number.MAX_VALUE;
    }

    registerTempFile(filePath: string) {
        if (!this.registryToken) {
            this.registryToken = {};
        }
        registry.register(this.registryToken, filePath);
    }

    async downloadFile(): Promise<string> {
        if (this.tmpFile) {
            return this.tmpFile;
        }

        const file = await this.tgCtx.getFile();

        this.tmpFile = this.localServer ? file.getUrl() : await file.download();

        this.registerTempFile(this.tmpFile);
        return this.tmpFile;
    }

    async removeFile(): Promise<void> {
        if (!this.tmpFile) {
            return;
        }
        try {
            if (await Util.fileExists(this.tmpFile)) {
                await fs.rm(this.tmpFile);
            }
            if (this.registryToken) {
                registry.unregister(this.registryToken);
                this.registryToken = undefined;
            }
            this.tmpFile = undefined;
        } catch {
            global.logger.fatal(`Failed to remove file: ${this.tmpFile}`);
        }
    }
}
