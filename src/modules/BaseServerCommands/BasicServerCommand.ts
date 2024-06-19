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


class CommandWithContext extends Command {
    ctx: UnifiedMessageContext;
    args: ICommandArgs;
    
    
    reply(text: string, options?: SendOptions): Promise<any> {
        return this.ctx.reply(`[Server: ${this.module.name}]\n` + text, options);
    }
    send(text: string, options?: SendOptions, replyTo?: number): Promise<any> {
        return this.ctx.send(`[Server: ${this.module.name}]\n` + text, options, replyTo);
    }
}

let createServerCommandRunner = (func: (self: CommandWithContext) => Promise<void>): (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void> => {
    return async (ctx, self, args) => {
        let command: CommandWithContext = self as CommandWithContext;
        command.ctx = ctx;
        command.args = args;

        try {
            await func(command);
        } catch (e) {
            let err = await self.module.bot.database.errors.addError(self.module.prefix[0], ctx, String(e));
            command.reply(`${Util.error(String(e))} (${err})`);
        }
    }
}

export class ServerCommand extends Command {
    constructor(name: String[], module: Module, func: (self: CommandWithContext) => Promise<void>) {
        super(name, module, createServerCommandRunner(func));
    }

}