import { Command } from "../../Command";
import { Module } from "../../Module";

export default class IgnoreCommand extends Command {
    constructor(module: Module) {
        super(["ignore", "шптщку"], module, async (ctx, self) => {
            let context = ctx.replyMessage || ctx.forwards[0];

            if(!context)
                return ctx.send("Перешлите сообщение!");
            
            let ignored = self.module.bot.ignored.switch(context.senderId);

            ctx.send(`[id${context.senderId}|Пользователь] ${ignored ? 'добавлен в игнор-лист' : 'убран из игнор-листа'}!`, {
                disable_mentions: 1
            });
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}