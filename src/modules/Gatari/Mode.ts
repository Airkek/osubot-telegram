import { Command } from "../../Command";
import { Module } from "../../Module";

export default class GatariMode extends Command {
    constructor(module: Module) {
        super(["mode", "m", "ь", "ьщву"], module, async (ctx, self, args) => {
            if(!args.string[0])
                return ctx.reply("Не указан режим!");
            let m = parseInt(args.string[0]);
            if(isNaN(m) || m > 3 || m < 0)
                return ctx.reply("Некорректный режим!");
            await self.module.bot.database.servers.gatari.setMode(ctx.senderId, m);
            ctx.reply(`[Server: ${self.module.name}]\nРежим установлен!`);
        });
    }
}