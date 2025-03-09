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

            await ctx.send(
                `tg://user?id=${context.senderId} ${ignored ? "добавлен в игнор-лист" : "убран из игнор-листа"}!`,
                {
                    disable_mentions: 1,
                }
            );
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
