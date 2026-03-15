import { Command } from "../../Command";
import { Module } from "../Module";

export default class IgnoreCommand extends Command {
    constructor(module: Module) {
        super(["ignore", "шптщку"], module, async (ctx, self, args) => {
            const arg = args.full[0];
            if (arg === undefined && !ctx.replyMessage) {
                await ctx.send("Перешлите сообщение или напишите id пользователя!");
                return;
            }

            let id = arg ? Number(arg) : ctx.replyMessage.senderId;
            if (arg.startsWith("@")) {
                const nickname = args.nickname[0].slice(1);
                const userInfo = await module.bot.database.userInfo.findByUsername(nickname);
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
                await ctx.send("Невалидный id");
                return;
            }

            const ignored = self.module.bot.ignored.switch(id);
            const mention = await self.module.bot.database.userInfo.getMention(id);

            await ctx.send(`${mention} ${ignored ? "добавлен в игнор-лист" : "убран из игнор-листа"}!`);
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
