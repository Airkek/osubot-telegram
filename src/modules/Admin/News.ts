import { Command } from "../../Command";
import { Module } from "../../Module";

export default class NewsCommand extends Command {
    constructor(module: Module) {
        super(["n", "news", "т", "туцы"], module, async (ctx, self, args) => {            
            if(!ctx.replyMessage && !ctx.hasForwards)
                return ctx.reply("Перешлите сообщение для рассылки!");

            let msg = ctx.replyMessage || ctx.forwards[0];

            self.module.bot.news.notify({
                message: msg.text,
                attachment: msg.attachments.map(att => att.toString()).join(","),
                type: "group"
            })
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}