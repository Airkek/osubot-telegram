import { Api, Bot, Context, InlineKeyboard, InputFile, InputMediaBuilder } from "grammy";
import { MessageEntity, UserFromGetMe } from "@grammyjs/types";
import { FileFlavor, FileApiFlavor } from "@grammyjs/files";
import TextLinkMessageEntity = MessageEntity.TextLinkMessageEntity;
import fs from "fs";

export type TgContext = FileFlavor<Context>;
export type TgApi = FileApiFlavor<Api>;

class ReplyToMessage {
    readonly text: string;
    readonly senderId: number;
    readonly chatId: number;

    constructor(ctx: TgContext) {
        this.text = ctx.message.reply_to_message.text;
        this.senderId = ctx.message.reply_to_message.from.id;
        this.chatId = ctx.message.reply_to_message.chat.id;
    }
}

interface IVideoMeta {
    url: string;
    width: number;
    height: number;
    duration: number;
}

export interface SendOptions {
    keyboard?: InlineKeyboard;
    photo?: string | InputFile;
    video?: IVideoMeta;
    dont_parse_links?: boolean;
}

const registry = new FinalizationRegistry((path: string) => {
    if (!fs.existsSync(path)) {
        return;
    }
    global.logger.warn(`Removing file ${path} after destructing object`);
    try {
        fs.rmSync(path);
    } catch {
        global.logger.fatal(`Failed to remove file: ${path}`);
    }
});

export default class UnifiedMessageContext {
    readonly chatId: number;
    readonly senderId: number;

    readonly text?: string;
    readonly messagePayload?: string;

    readonly replyMessage?: ReplyToMessage;

    readonly isInGroupChat: boolean;

    readonly isFromBot: boolean;
    readonly isFromUser: boolean;

    private readonly tgCtx: TgContext;
    private readonly tg: Bot;
    private readonly me: UserFromGetMe;
    private readonly localServer: boolean;

    private tmpFile?: string;
    private registryToken?: object;

    constructor(ctx: TgContext, tg: Bot, me: UserFromGetMe, isLocal: boolean) {
        this.tgCtx = ctx;
        this.tg = tg;
        this.me = me;
        this.localServer = isLocal;

        this.text = ctx.message?.text ? ctx.message?.text : ctx.message?.caption;
        this.messagePayload = ctx.callbackQuery?.data;
        this.replyMessage = ctx.message?.reply_to_message ? new ReplyToMessage(ctx) : undefined;
        this.isInGroupChat = ctx.chat.type == "supergroup" || ctx.chat.type == "group";
        this.senderId = ctx.from.id;
        this.chatId = ctx.chat.id;
        this.isFromBot = ctx.from.is_bot;
        this.isFromUser = !ctx.from.is_bot;
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
        try {
            if (options?.photo) {
                return await this.tgCtx.replyWithPhoto(options.photo, {
                    caption: text,
                    reply_parameters: {
                        message_id: replyTo,
                    },
                    reply_markup: options.keyboard,
                });
            }

            if (options?.video) {
                const video = InputMediaBuilder.video(new InputFile(new URL(options.video.url)), {
                    width: options.video.width,
                    height: options.video.height,
                    duration: options.video.duration,
                    supports_streaming: true,
                    caption: text,
                });
                const sent = await this.tg.api.sendMediaGroup(this.tgCtx.chatId, [video], {
                    reply_parameters: {
                        message_id: replyTo,
                    },
                });
                return sent[0];
            }

            return await this.tgCtx.reply(text, {
                link_preview_options: {
                    is_disabled: options?.dont_parse_links !== false,
                },
                reply_parameters: {
                    message_id: replyTo,
                },
                reply_markup: options?.keyboard,
            });
        } catch (e) {
            global.logger.error(e);
            return undefined;
        }
    }

    async edit(text: string, options?: SendOptions) {
        if (!this.messagePayload) {
            return undefined;
        }

        // TODO: support media
        return await this.tgCtx.editMessageText(text, {
            link_preview_options: {
                is_disabled: options?.dont_parse_links !== false,
            },
            reply_markup: options?.keyboard,
        });
    }

    async answer(text: string): Promise<true> {
        if (!this.messagePayload) {
            return;
        }
        return await this.tgCtx.answerCallbackQuery(text);
    }

    async isSenderAdmin(): Promise<boolean> {
        try {
            const res = await this.tg.api.getChatMember(this.chatId, this.senderId);
            return res.status == "creator" || res.status == "administrator";
        } catch (e) {
            if (e.message.includes("CHAT_ADMIN_REQUIRED")) {
                return false;
            }

            throw e;
        }
    }

    async isBotAdmin(): Promise<boolean> {
        try {
            const res = await this.tg.api.getChatMember(this.chatId, this.me.id);
            return res.status == "creator" || res.status == "administrator";
        } catch (e) {
            if (e.message.includes("CHAT_ADMIN_REQUIRED")) {
                return false;
            }

            throw e;
        }
    }

    async isUserInChat(userId: number): Promise<boolean> {
        try {
            const user = await this.tg.api.getChatMember(this.chatId, userId);
            return user && user.status != "kicked" && user.status != "left";
        } catch (e) {
            return !e.description?.includes("member not found");
        }
    }

    chatMembersCount(): Promise<number> {
        return this.tg.api.getChatMemberCount(this.chatId);
    }

    hasLinks(): boolean {
        return this.tgCtx.message?.entities?.some((entity) => entity.type === "text_link");
    }

    getLinks(): Array<TextLinkMessageEntity> {
        return this.tgCtx.message?.entities?.filter((entity) => entity.type === "text_link");
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

    async downloadFile(): Promise<string> {
        if (this.tmpFile) {
            return this.tmpFile;
        }

        const file = await this.tgCtx.getFile();

        if (this.localServer) {
            const url = file.getUrl();
            this.tmpFile = url;
            registry.register(this, url);
            return url;
        }

        const filePath = await file.download();
        this.tmpFile = filePath;
        this.registryToken = {};
        registry.register(this.registryToken, filePath);
        return filePath;
    }

    removeFile(): void {
        if (!this.tmpFile) {
            return;
        }
        try {
            if (fs.existsSync(this.tmpFile)) {
                fs.rmSync(this.tmpFile);
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
