import { Command } from "../../Command";
import { Module } from "../Module";

export default class IgnoreCommand extends Command {
    constructor(module: Module) {
        super(["ignore", "шптщку"], module, async (ctx, self) => {
            const context = ctx.replyMessage;

            if (!context) {
                await ctx.send("Перешлите сообщение!");
                return;
            }

            const ignored = self.module.bot.ignored.switch(context.senderId);
            const mention = await self.module.bot.database.userInfo.getMention(context.senderId);

            await ctx.send(`${mention} ${ignored ? "добавлен в игнор-лист" : "убран из игнор-листа"}!`);
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
