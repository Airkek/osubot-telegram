import { Command } from "../../Command";
import { Module } from "../Module";

export default class IgnoreCommand extends Command {
    constructor(module: Module) {
        super(["ignore", "шптщку"], module, async (ctx, self, args) => {
            const arg = args.full[0];
            if (arg === undefined && !ctx.replyMessage) {
                await ctx.send(ctx.tr("admin-user-target-required"));
                return;
            }

            let accountId = ctx.replyMessage?.senderId;
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
            } else if (arg !== undefined) {
                const externalId = Number(arg);
                if (!Number.isSafeInteger(externalId)) {
                    await ctx.send(ctx.tr("admin-invalid-user-id"));
                    return;
                }
                accountId = (await module.bot.storage.identities.resolveUser(externalId)).accountId;
            }

            if (accountId === undefined) {
                await ctx.send(ctx.tr("admin-invalid-user-id"));
                return;
            }

            const ignored = await self.module.bot.ignored.switch(accountId);
            const mention = await ctx.mentionUser(accountId);
            await ctx.send(ctx.tr(ignored ? "admin-ignore-added" : "admin-ignore-removed", { user: mention }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
