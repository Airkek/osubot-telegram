import { IMessageContext } from "core/IMessageContext";
import { Command } from "commands/Command";
import { CommandContext } from "commands/CommandContext";
import { ICommandArgs } from "commands/ICommandArgs";
import { ServerModule } from "commands/ServerModule";

const createServerCommandRunner = (
    func: (self: CommandContext) => Promise<void>,
    needUserParse: boolean
): ((ctx: IMessageContext, self: ServerCommand, args: ICommandArgs) => Promise<void>) => {
    return async (ctx, self, args) => {
        const context = new CommandContext(self, ctx, args);

        context.user = {
            dbUser: await self.module.db.getUser(context.ctx.userId),
        };
        if (needUserParse) {
            if (context.ctx.replyMessage) {
                context.user.dbUser = await self.module.db.getUser(context.ctx.replyMessage.userId);

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
                    const userInfo = await context.module.bot.storage.userDirectory.findByUsername(nickname);
                    if (!userInfo) {
                        await context.reply(
                            ctx.tr("unknown-username", {
                                prefix: context.module.prefix[0],
                            })
                        );
                        return;
                    }

                    const identity = await context.module.bot.storage.identities.getUser(userInfo.account_id);
                    context.user.dbUser = identity ? await self.module.db.getUser(identity.userId) : null;
                    if (!context.user.dbUser) {
                        await context.reply(
                            ctx.tr("user-nickname-not-specified", {
                                prefix: context.module.prefix[0],
                            })
                        );
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
