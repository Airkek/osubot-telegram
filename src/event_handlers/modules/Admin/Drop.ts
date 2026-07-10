import { Command } from "../../Command";
import { Module } from "../Module";

export default class DropCommand extends Command {
    constructor(module: Module) {
        super(["drop", "вкщз"], module, async (ctx, self, args) => {
            const arg = args.full[0];
            if (arg === undefined && !ctx.replyMessage) {
                await ctx.send(ctx.tr("admin-user-target-required"));
                return;
            }

            let accountId = ctx.replyMessage?.senderId;
            let userId = ctx.replyMessage?.userId;
            if (arg?.startsWith("@")) {
                const nickname = args.nickname[0].slice(1);
                const userInfo = await module.bot.storage.userDirectory.findByUsername(nickname);
                if (!userInfo) {
                    await ctx.reply(
                        ctx.tr("unknown-username", {
                            prefix: module.prefix[0],
                        })
                    );
                    return;
                }

                accountId = userInfo.account_id;
                userId = (await module.bot.storage.identities.getUser(accountId))?.userId;
            } else if (arg !== undefined) {
                const externalId = Number(arg);
                if (!Number.isSafeInteger(externalId)) {
                    await ctx.send(ctx.tr("admin-invalid-user-id"));
                    return;
                }
                const identity = await module.bot.storage.identities.findUser(externalId);
                accountId = identity?.accountId;
                userId = identity?.userId;
            }

            if (accountId === undefined || userId === undefined) {
                await ctx.send(ctx.tr("admin-invalid-user-id"));
                return;
            }

            await self.module.bot.storage.userRemoval.dropUser(userId);

            const mention = await ctx.mentionUser(accountId);
            await ctx.send(ctx.tr("admin-drop-success", { user: mention }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
