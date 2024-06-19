import { InlineKeyboard } from "grammy";
import { Command } from "../../Command";
import UnifiedMessageContext from "../../TelegramSupport";
import { APIUser, ICommandArgs, IDatabaseUser } from "../../Types";
import { Module } from "../../Module";
import Util from "../../Util";

interface SendOptions {
    keyboard?: InlineKeyboard;
    attachment?: string;
    dont_parse_links?: number | boolean;
    disable_mentions?: number | boolean;
}

interface ParsedUser {
    username?: string,
    dbUser?: IDatabaseUser
}


class CommandContext {
    readonly name: String | String[];
    readonly module: Module;
    readonly ctx: UnifiedMessageContext;
    readonly args: ICommandArgs;
    user: ParsedUser;
    
    
    constructor(command: ServerCommand, ctx: UnifiedMessageContext, args: ICommandArgs) {
        this.ctx = ctx;
        this.args = args;
        this.name = command.name;
        this.module = command.module;
    }
    
    reply(text: string, options?: SendOptions): Promise<any> {
        return this.ctx.reply(`[Server: ${this.module.name}]\n` + text, options);
    }
    send(text: string, options?: SendOptions, replyTo?: number): Promise<any> {
        return this.ctx.send(`[Server: ${this.module.name}]\n` + text, options, replyTo);
    }
}

let createServerCommandRunner = (func: (self: CommandContext) => Promise<void>, needUserParse: boolean): (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void> => {
    return async (ctx, self, args) => {
        let context = new CommandContext(self, ctx, args);

        if (needUserParse) {
            context.user = { }; 
            if(context.ctx.hasReplyMessage) {
                context.user.dbUser = await self.module.db.getUser(context.ctx.replyMessage.senderId);

                if(!context.user.dbUser.nickname) {
                    return context.reply(`У этого пользователя не указан ник!\nПривяжите через ${context.module.prefix[0]} nick <ник>`);
                }                    
            } else {
                context.user.dbUser = await self.module.db.getUser(context.ctx.senderId);

                if(!context.user.dbUser.nickname) {
                    return context.reply(`Не указан ник!\nПривяжите через ${context.module.prefix[0]} nick <ник>`);
                }
            }
            if (args.nickname[0]) {
                context.user.username = context.args.nickname.join(" ");
            }
        }

        try {
            await func(context);
        } catch (e) {
            let err = await self.module.bot.database.errors.addError(self.module.prefix[0], ctx, String(e));
            context.reply(`${Util.error(String(e))} (${err})`);
        }
    }
}

export class ServerCommand extends Command {
    constructor(name: String[], module: Module, func: (self: CommandContext) => Promise<void>, needUserParse: boolean = false) {
        super(name, module, createServerCommandRunner(func, needUserParse));
    }

}