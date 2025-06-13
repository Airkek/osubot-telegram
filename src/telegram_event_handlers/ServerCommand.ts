import { Command, ICommandArgs } from "./Command";
import UnifiedMessageContext, { SendOptions } from "../TelegramSupport";
import { IDatabaseUser } from "../Types";
import { ServerModule } from "./modules/Module";
import { ILocalisator } from "../ILocalisator";

interface ParsedUser {
    username?: string;
    id?: string;
    dbUser: IDatabaseUser;
}

export class CommandContext {
    readonly name: string | string[];
    readonly module: ServerModule;
    readonly ctx: UnifiedMessageContext;
    readonly args: ICommandArgs;
    readonly isPayload: boolean;
    user: ParsedUser;

    constructor(command: ServerCommand, ctx: UnifiedMessageContext, args: ICommandArgs) {
        this.ctx = ctx;
        this.args = args;
        this.name = command.name;
        this.module = command.module;
        this.isPayload = !!ctx.messagePayload;
    }

    private addServerToText(text: string, l: ILocalisator) {
        return `${l.tr("server-name", {
            server: this.module.name,
        })}\n${text}`;
    }

    async reply(text: string, options?: SendOptions) {
        await this.ctx.reply(this.addServerToText(text, this.ctx), options);
    }
    async send(text: string, options?: SendOptions, replyTo?: number) {
        return this.ctx.send(this.addServerToText(text, this.ctx), options, replyTo);
    }
    async edit(text: string, options?: SendOptions) {
        return this.ctx.edit(this.addServerToText(text, this.ctx), options);
    }
    async answer(text: string) {
        return this.ctx.answer(text);
    }
}

const createServerCommandRunner = (
    func: (self: CommandContext) => Promise<void>,
    needUserParse: boolean
): ((ctx: UnifiedMessageContext, self: ServerCommand, args: ICommandArgs) => Promise<void>) => {
    return async (ctx, self, args) => {
        const context = new CommandContext(self, ctx, args);

        context.user = {
            dbUser: await self.module.db.getUser(context.ctx.senderId),
        };
        if (needUserParse) {
            if (context.ctx.replyMessage) {
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

        await func(context);
    };
};

export class ServerCommand extends Command {
    declare module: ServerModule;

    constructor(
        name: string[],
        module: ServerModule,
        func: (self: CommandContext) => Promise<void>,
        needUserParse: boolean = false
    ) {
        super(name, module, createServerCommandRunner(func, needUserParse));
    }
}
