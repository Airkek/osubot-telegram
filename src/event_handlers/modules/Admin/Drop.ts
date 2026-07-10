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

            let id = arg ? Number(arg) : ctx.replyMessage.senderId;
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

                id = userInfo.user_id;
            }

            if (isNaN(id)) {
                await ctx.send(ctx.tr("admin-invalid-user-id"));
                return;
            }

            await self.module.bot.storage.userRemoval.dropUser(id);

            const mention = await ctx.mentionUser(id);
            await ctx.send(ctx.tr("admin-drop-success", { user: mention }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
