import { Bot, Context, GrammyError, InlineKeyboard } from "grammy";

class ReplyToMessage {
    readonly text: string;
    readonly senderId: number;
    readonly peerId: number;

    constructor(ctx: Context) {
        this.text = ctx.message.reply_to_message.text;
        this.senderId = ctx.message.reply_to_message.from.id;
        this.peerId = ctx.message.reply_to_message.chat.id;
    }
}

interface SendOptions {
    keyboard?: InlineKeyboard;
    attachment?: string;
    dont_parse_links?: number | boolean;
    disable_mentions?: number | boolean;
}

export default class UnifiedMessageContext {
    readonly text: string;
    readonly hasText: boolean;
    readonly hasMessagePayload: boolean;
    readonly messagePayload: any;
    readonly hasReplyMessage: boolean;
    readonly replyMessage: ReplyToMessage;
    readonly hasForwards: boolean;
    readonly forwards: any[];
    readonly isChat: boolean;
    readonly senderId: number;
    readonly peerId: number;
    readonly isGroup: boolean;
    readonly isFromGroup: boolean;
    readonly isEvent: boolean;
    readonly isFromUser: boolean;
    readonly chatId: number;

    readonly tgCtx: Context;
    readonly tg: Bot;

    reply: (text: string, options?: SendOptions) => Promise<any>;
    edit: (text: string, options?: SendOptions) => Promise<any>;
    send: (text: string, options?: SendOptions, replyTo?: number) => Promise<any>;
    isAdmin: () => Promise<boolean>;
    isUserInChat: (userId: number) => Promise<boolean>;
    countMembers: () => Promise<number>;
    hasAttachments: (type: string) => boolean;
    getAttachments: (type: string) => Array<any>; 

    constructor(ctx: Context, tg: Bot) {
        this.tgCtx = ctx;
        this.tg = tg;

        let isMessage = ctx.message !== undefined; 
        this.text = isMessage ? (ctx.message.text ? ctx.message.text : ctx.message.caption) : undefined;
        this.hasText = this.text !== undefined;
        this.messagePayload = ctx.callbackQuery?.data;
        this.hasMessagePayload = this.messagePayload !== undefined;
        this.hasReplyMessage = ctx.message?.reply_to_message !== undefined;
        this.replyMessage = this.hasReplyMessage ? new ReplyToMessage(ctx) : null;
        this.isChat = ctx.chat.type == "supergroup" || ctx.chat.type == "group";
        this.senderId = ctx.from.id;
        this.peerId = ctx.chat.id;
        this.chatId = ctx.chat.id;
        this.isGroup = ctx.from.is_bot;
        this.isFromGroup = ctx.from.is_bot;
        this.isEvent = false;
        this.isFromUser = !ctx.from.is_bot;
        this.isAdmin = async () => {
            let user = await this.tg.api.getChatMember(this.chatId, this.senderId);
            return user.status == "creator" || user.status == "administrator"
        }

        this.isUserInChat = async (userId: number) => {
            try {
                let user = await this.tg.api.getChatMember(this.chatId, userId);
                return user && user.status != "kicked" && user.status != "left";
            } catch (e) {
                return !e.description?.includes("member not found");
            }
        }

        this.countMembers = async () => {
            return this.tg.api.getChatMemberCount(this.chatId);
        }

        this.edit = async (text: string, options?: SendOptions, replyTo?: number) => {
            if (!this.tgCtx.callbackQuery) {
                return;
            }
            await this.tgCtx.editMessageText(text, {reply_markup: options.keyboard});
        }

        this.send = async (text: string, options?: SendOptions, replyTo?: number) => {
            let opts: any = {
                disable_web_page_preview: true
            }

            if (options?.dont_parse_links === false) {
                opts.disable_web_page_preview = false;
            }
            if (replyTo !== undefined) {
                opts['reply_parameters'] = {
                    message_id: replyTo
                } 
            }
            if (options?.keyboard !== undefined) {
                opts['reply_markup'] = options.keyboard
            }

            try {
                if (options?.attachment !== undefined && options.attachment.length != 0) {
                    opts['caption'] = text
                    return await this.tgCtx.replyWithPhoto(options.attachment, opts);
                } else {
                    return await this.tgCtx.reply(text, opts);
                }
            } catch (e) {
                console.log(e);
            }
        }

        let callbackReplyTo = this.tgCtx.callbackQuery?.from.username ? `@${this.tgCtx.callbackQuery.from.username}` : this.tgCtx.callbackQuery?.from.first_name;

        this.reply = (text: string, options?: SendOptions) => {
            return this.send(isMessage ? text : callbackReplyTo + ",\n" + text, options, isMessage ? this.tgCtx.message.message_id : undefined);
        };

        this.hasAttachments = (type: string) => {
            switch (type) {
                case "doc":
                    return this.tgCtx.message.document !== undefined
                case "link":
                    return this.tgCtx.message.entities !== undefined && this.tgCtx.message.entities.some(entity => entity.type === 'text_link');
                default:
                    return false;
            }
        }

        this.getAttachments = (type: string) => {
            switch (type) {
                case "doc":
                    return [this.tgCtx.message.document];
                case "link":
                    return [this.tgCtx.message.entities?.filter(entity => entity.type === 'text_link')];
                default:
                    return [];
            }
        }

    }
}