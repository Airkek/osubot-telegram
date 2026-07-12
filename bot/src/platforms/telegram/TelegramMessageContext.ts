import { MessageNotModifiedError } from "core/MessageNotModifiedError";
import { IReplyMessage } from "core/IReplyMessage";
import { ISendOptions } from "core/ISendOptions";
import { ITextLinkEntity } from "core/ITextLinkEntity";
import { Api, Context, GrammyError, InlineKeyboard, InputFile, InputMediaBuilder } from "grammy";
import { UserFromGetMe } from "@grammyjs/types";
import { FileApiFlavor, FileFlavor } from "@grammyjs/files";
import { TranslateFunction } from "localization/ILocalizer";
import { BaseMessageContext, MessageContextStorage } from "core/BaseMessageContext";
import { FluentLocalizer } from "localization/FluentLocalizer";
import { Language } from "core/Language";
import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { validateKeyboard } from "presentation/keyboard/makeKeyboard";

export type TgContext = FileFlavor<Context>;
export type TgApi = FileApiFlavor<Api>;

function replyMessage(ctx: TgContext): IReplyMessage | undefined {
    if (!ctx.message?.reply_to_message) {
        return undefined;
    }

    const reply = ctx.message.reply_to_message;
    if (reply.forum_topic_created || reply.forum_topic_closed || reply.forum_topic_reopened) {
        return undefined;
    }
    if (reply.sender_chat || !reply.from) {
        return undefined;
    }

    return {
        text: reply.text ?? reply.caption ?? "",
        externalSenderId: reply.from.id,
        externalChatId: reply.chat.id,
    };
}

function telegramLanguage(languageCode?: string): Language {
    const normalized = languageCode?.toLowerCase() ?? "";
    if (normalized.startsWith("ru")) {
        return "ru";
    }
    if (normalized.startsWith("zh")) {
        return "zh";
    }
    return "en";
}

export class TelegramMessageContext extends BaseMessageContext {
    private userInfoUpdated = false;
    private callbackAnswered = false;

    constructor(
        private readonly tgCtx: TgContext,
        ownerId: number,
        private readonly me: UserFromGetMe,
        private readonly localServer: boolean,
        storage: MessageContextStorage,
        private readonly localizer: FluentLocalizer
    ) {
        super(
            {
                platform: "telegram",
                externalChatId: tgCtx.chatId,
                externalSenderId: tgCtx.from.id,
                ownerId,
                plainText: tgCtx.message?.text ?? tgCtx.message?.caption,
                plainPayload: tgCtx.callbackQuery?.data,
                replyMessage: replyMessage(tgCtx),
                isInGroupChat: tgCtx.chat.type === "supergroup" || tgCtx.chat.type === "group",
                defaultLanguage: telegramLanguage(tgCtx.from.language_code),
            },
            storage
        );
    }

    protected async createTranslate(language?: Language): Promise<TranslateFunction> {
        return this.localizer.translator(language, {
            first_name: this.tgCtx.from?.first_name ?? "",
            last_name: this.tgCtx.from?.last_name ?? "",
            user_mention: this.telegramMention(),
        });
    }

    async ensureUserInfoUpdated(): Promise<void> {
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

    async reply(text: string, options?: ISendOptions): Promise<unknown> {
        const callbackReplyTo = this.telegramMention();
        const isMessage = this.tgCtx.message !== undefined;
        return await this.send(
            isMessage ? text : `${callbackReplyTo},\n${text}`,
            options,
            isMessage ? this.tgCtx.message.message_id : undefined
        );
    }

    async send(text: string, options?: ISendOptions, replyTo?: number): Promise<unknown> {
        const keyboard = await this.createKeyboard(options?.keyboard);
        if (options?.photo) {
            const photo = Buffer.isBuffer(options.photo) ? new InputFile(options.photo) : options.photo;
            return await this.tgCtx.replyWithPhoto(photo, {
                caption: text,
                reply_parameters: { message_id: replyTo },
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
                reply_parameters: { message_id: replyTo },
                reply_markup: keyboard,
            });
        }
        return await this.tgCtx.reply(text, {
            link_preview_options: { is_disabled: options?.dont_parse_links !== false },
            reply_parameters: { message_id: replyTo },
            reply_markup: keyboard,
        });
    }

    async remove(): Promise<void> {
        if (!this.messagePayload) {
            return;
        }
        try {
            await this.tgCtx.deleteMessage();
        } catch (error) {
            global.logger.error("Failed to remove Telegram message", error);
        }
    }

    async edit(text: string, options?: ISendOptions): Promise<void> {
        if (!this.messagePayload) {
            return;
        }

        const keyboard = await this.createKeyboard(options?.keyboard);
        const hasMedia = options?.photo || options?.video || this.tgCtx.message?.photo || this.tgCtx.message?.video;
        try {
            if (hasMedia) {
                if (options?.photo) {
                    const photo = Buffer.isBuffer(options.photo) ? new InputFile(options.photo) : options.photo;
                    await this.tgCtx.editMessageMedia(InputMediaBuilder.photo(photo), { reply_markup: keyboard });
                } else if (options?.video) {
                    const video = InputMediaBuilder.video(new InputFile(new URL(options.video.url)), {
                        width: options.video.width,
                        height: options.video.height,
                        duration: options.video.duration,
                        supports_streaming: true,
                        caption: text,
                    });
                    await this.tgCtx.editMessageMedia(video, { reply_markup: keyboard });
                }
                await this.tgCtx.editMessageCaption({ reply_markup: keyboard, caption: text });
            } else if (text !== this.text) {
                await this.tgCtx.editMessageText(text, {
                    link_preview_options: { is_disabled: options?.dont_parse_links !== false },
                    reply_markup: keyboard,
                });
            } else if (options?.keyboard) {
                await this.tgCtx.editMessageReplyMarkup({ reply_markup: keyboard });
            }
        } catch (error) {
            if (error instanceof GrammyError && error.message.includes("message is not modified")) {
                throw new MessageNotModifiedError();
            }
            throw error;
        }
    }

    async editMarkup(keyboard: IKeyboard): Promise<unknown> {
        if (!this.messagePayload) {
            return undefined;
        }
        const markup = await this.createKeyboard(keyboard);
        if (!markup) {
            return undefined;
        }
        return await this.tgCtx.editMessageReplyMarkup({ reply_markup: markup });
    }

    async answer(text: string): Promise<true | void> {
        if (!this.messagePayload) {
            return undefined;
        }
        const result = await this.tgCtx.answerCallbackQuery(text);
        this.callbackAnswered = true;
        return result;
    }

    async acknowledge(): Promise<void> {
        if (!this.messagePayload || this.callbackAnswered) {
            return;
        }
        await this.tgCtx.answerCallbackQuery();
        this.callbackAnswered = true;
    }

    async isUserAdmin(accountId: number): Promise<boolean> {
        const externalUserId = await this.getExternalUserId(accountId);
        return externalUserId === undefined ? false : await this.isExternalUserAdmin(externalUserId);
    }

    async isSenderAdmin(): Promise<boolean> {
        return await this.isExternalUserAdmin(Number(this.externalSenderId));
    }

    async isBotAdmin(): Promise<boolean> {
        return await this.isExternalUserAdmin(this.me.id);
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
            if (chatId !== undefined && !(await this.isChatValid(chatId))) {
                return false;
            }
            const user = await this.tgCtx.api.getChatMember(externalChatId, externalUserId);
            return user.status !== "kicked" && user.status !== "left";
        } catch (error) {
            const description = error instanceof GrammyError ? error.description : "";
            return !description.includes("member not found");
        }
    }

    async isChatValid(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        if (externalChatId === undefined) {
            return false;
        }
        try {
            return Boolean(await this.tgCtx.api.getChat(externalChatId));
        } catch (error) {
            const description = error instanceof GrammyError ? error.description : "";
            return !description.includes("chat not found");
        }
    }

    async isBotInChat(chatId: number): Promise<boolean> {
        const externalChatId = await this.getExternalChatId(chatId);
        if (externalChatId === undefined || !(await this.isChatValid(chatId))) {
            return false;
        }
        try {
            const user = await this.tgCtx.api.getChatMember(externalChatId, this.me.id);
            return user.status !== "kicked" && user.status !== "left";
        } catch (error) {
            const description = error instanceof GrammyError ? error.description : "";
            return !description.includes("member not found");
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

    async chatMembersCount(): Promise<number> {
        return await this.tgCtx.api.getChatMemberCount(this.externalChatId);
    }

    hasLinks(): boolean {
        return this.tgCtx.message?.entities?.some((entity) => entity.type === "text_link") ?? false;
    }

    getLinks(): ITextLinkEntity[] {
        return (
            (this.tgCtx.message?.entities?.filter((entity) => entity.type === "text_link") as ITextLinkEntity[]) ?? []
        );
    }

    hasFile(): boolean {
        return Boolean(this.tgCtx.message?.document);
    }

    getFileName(): string {
        return this.tgCtx.message?.document?.file_name;
    }

    getFileSize(): number {
        return this.tgCtx.message?.document?.file_size ?? Number.MAX_VALUE;
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

    private async createKeyboard(rows?: IKeyboard): Promise<InlineKeyboard | undefined> {
        if (!rows?.length) {
            return undefined;
        }
        validateKeyboard(rows);
        const buttonRows = await Promise.all(
            rows.map(
                async (row) =>
                    await Promise.all(
                        row.map(async (button) =>
                            InlineKeyboard.text(button.text, await this.prepareButtonPayload(button.command))
                        )
                    )
            )
        );
        return InlineKeyboard.from(buttonRows);
    }

    private async isExternalUserAdmin(userId: number): Promise<boolean> {
        try {
            const result = await this.tgCtx.api.getChatMember(this.externalChatId, userId);
            return result.status === "creator" || result.status === "administrator";
        } catch (error) {
            if (error instanceof GrammyError && error.message.includes("CHAT_ADMIN_REQUIRED")) {
                return false;
            }
            throw error;
        }
    }

    private telegramMention(): string {
        if (this.tgCtx.from?.username) {
            return `@${this.tgCtx.from.username}`;
        }
        return this.tgCtx.from?.first_name ?? "";
    }
}
