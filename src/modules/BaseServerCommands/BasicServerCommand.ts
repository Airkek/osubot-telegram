import { InlineKeyboard } from "grammy";
import { Command } from "../../Command";
import UnifiedMessageContext from "../../TelegramSupport";
import { ICommandArgs, IDatabaseUser } from "../../Types";
import { Module } from "../../Module";
import Util from "../../Util";

interface SendOptions {
    keyboard?: InlineKeyboard;
    attachment?: string;
    dont_parse_links?: number | boolean;
    disable_mentions?: number | boolean;
}

interface ParsedUser {
    username?: string;
    id?: string;
    dbUser: IDatabaseUser;
}

export class CommandContext {
    readonly name: string | string[];
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

    reply(text: string, options?: SendOptions): Promise<void> {
        return this.ctx.reply(`[Server: ${this.module.name}]\n${text}`, options);
    }
    send(text: string, options?: SendOptions, replyTo?: number): Promise<void> {
        return this.ctx.send(`[Server: ${this.module.name}]\n${text}`, options, replyTo);
    }
}

const createServerCommandRunner = (
    func: (self: CommandContext) => Promise<void>,
    needUserParse: boolean
): ((ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void>) => {
    return async (ctx, self, args) => {
        const context = new CommandContext(self, ctx, args);

        context.user = {
            dbUser: await self.module.db.getUser(context.ctx.senderId),
        };
        if (needUserParse) {
            if (context.ctx.hasReplyMessage) {
                context.user.dbUser = await self.module.db.getUser(context.ctx.replyMessage.senderId);

                if (!context.user.dbUser && !args.nickname[0]) {
                    await context.reply(
                        `У этого пользователя не указан ник!\nПривяжите через ${context.module.prefix[0]} nick <ник>`
                    );
                    return;
                }
            } else if (!context.user.dbUser && !args.nickname[0]) {
                await context.reply(`Не указан ник!\nПривяжите через ${context.module.prefix[0]} nick <ник>`);
                return;
            }

            if (args.nickname[0]) {
                if (context.module.api.getUser == undefined) {
                    context.user.id = context.args.nickname[0];
                } else {
                    context.user.username = context.args.nickname.join(" ");
                }
            }
        }

        try {
            await func(context);
        } catch (e: unknown) {
            const err = await self.module.bot.database.errors.addError(ctx, e);

            let errorText: string;
            if (e instanceof Error) {
                errorText = e.message;
            } else if (e instanceof String) {
                errorText = String(e);
            }

            await context.reply(`${Util.error(errorText)} (${err})`);
        }
    };
};

export class ServerCommand extends Command {
    constructor(
        name: string[],
        module: Module,
        func: (self: CommandContext) => Promise<void>,
        needUserParse: boolean = false
    ) {
        super(name, module, createServerCommandRunner(func, needUserParse));
    }
}
