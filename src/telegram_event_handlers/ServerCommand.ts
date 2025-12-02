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
                        ctx.tr("user-nickname-not-specified", {
                            prefix: context.module.prefix[0],
                        })
                    );
                    return;
                }
            } else if (!context.user.dbUser && !args.nickname[0]) {
                await context.reply(
                    ctx.tr("sender-nickname-not-specified", {
                        prefix: context.module.prefix[0],
                    })
                );
                return;
            }

            if (args.nickname[0]) {
                if (args.nickname[0].startsWith("@")) {
                    const nickname = args.nickname[0].slice(1);
                    const userInfo = await context.module.bot.database.userInfo.findByUsername(nickname);
                    if (!userInfo) {
                        ctx.tr("unknown-username", {
                            prefix: context.module.prefix[0],
                        });
                        return;
                    }

                    context.user.dbUser = await self.module.db.getUser(userInfo.user_id);
                    if (!context.user.dbUser) {
                        ctx.tr("user-nickname-not-specified", {
                            prefix: context.module.prefix[0],
                        });
                        return;
                    }
                } else if (context.module.api.getUser == undefined) {
                    // server supports only user id
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
