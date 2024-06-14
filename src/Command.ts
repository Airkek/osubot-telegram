import { Module } from './Module';
import Util from './Util';
import { ICommandArgs } from './Types';
import { Bot, Context, InlineKeyboard } from 'grammy'

export class ReplyToMessage {
    readonly text: string;
    readonly senderId: number;
    readonly peerId: number;

    constructor(ctx: Context) {
        this.text = ctx.message.reply_to_message.text;
        this.senderId = ctx.message.reply_to_message.from.id;
        this.peerId = ctx.message.reply_to_message.chat.id;
    }
}

export class SendOptions {
    keyboard?: InlineKeyboard;
    attachment?: string;
    dont_parse_links?: number | boolean;
    disable_mentions?: number | boolean;
}

export class UnifiedMessageContext {
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

    reply: (text: string, options?: SendOptions) => void;
    send: (text: string, options?: SendOptions, replyTo?: number) => void;
    isAdmin: () => Promise<boolean>;
    hasAttachments: (type: string) => boolean;
    getAttachments: (type: string) => Array<any>; 
    getChatMembers: () => Promise<Array<any>>

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
        this.hasForwards = false; // in telegram we cant forward message as attachment, for compatibility only
        this.forwards = [];
        this.isChat = ctx.chat.type == "supergroup";
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

        this.send = (text: string, options?: SendOptions, replyTo?: number) => {
            let opts: any = {
                disable_web_page_preview: true
            }
            if (replyTo !== undefined) {
                opts['reply_parameters'] = {
                    message_id: replyTo
                } 
            }
            if (options?.keyboard !== undefined) {
                opts['reply_markup'] = options.keyboard
            }
            if (options?.disable_mentions) {
                // TODO: telegram-support: handle this
            }

            if (options?.attachment !== undefined && options.attachment.length != 0) {
                opts['caption'] = text
                this.tgCtx.replyWithPhoto(options.attachment, opts);
            } else {
                this.tgCtx.reply(text, opts);
            }
        }

        let callbackReplyTo = this.tgCtx.callbackQuery?.from.username ? `@${this.tgCtx.callbackQuery.from.username}` : this.tgCtx.callbackQuery?.from.first_name;

        this.reply = (text: string, options?: SendOptions) => {
            this.send(isMessage ? text : callbackReplyTo + ",\n" + text, options, isMessage ? this.tgCtx.message.message_id : undefined);
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

        this.getChatMembers = async () => {
            return []; // TODO: telegram-support: implement members fetching
        }

    }
}

export class Command {
    readonly name: String | String[];
    module: Module;
    disables: boolean = true;
    uses: number;
    function: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => void;

    permission: (ctx: UnifiedMessageContext) => boolean;
    constructor(name: String | String[], module: Module, func: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => void) {
        this.name = name;
        this.module = module;
        this.function = func;

        this.uses = 0;
        this.permission = () => true;
    }

    public process(ctx: UnifiedMessageContext) {
        if(!this.permission(ctx)) return;
        this.uses++;
        if(ctx.hasMessagePayload)
            this.function(
                ctx, this,
                Util.parseArgs(ctx.messagePayload.split(" ").slice(2))
            );
        else
            this.function(
                ctx, this, 
                Util.parseArgs(ctx.text.split(" ").slice(2))
            );
    }

    public check(name: String) {
        if(Array.isArray(this.name))
            return this.name.includes(name.toLowerCase());
        else
            return this.name == name.toLowerCase();
    }
}