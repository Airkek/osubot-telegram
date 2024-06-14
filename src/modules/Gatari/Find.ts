import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class GatariFind extends Command {
    constructor(module: Module) {
        super(["f", "find", "а", "аштв"], module, async (ctx, self, args) => {
            if(!args.nickname[0])
                return ctx.reply("Укажите ник!");
            try {
                let u = await self.module.bot.api.gatari.getUser(args.nickname.join(" "));
                let users = await self.module.bot.database.servers.gatari.findByUserId(u.id);
                if(!users[0])
                    return ctx.reply("Не найдено пользователей с таким ником!");
                let keyboard = Util.createKeyboard([
                    [{
                        text: 'Посмотреть профиль',
                        command: `g u ${u.nickname}`
                    }]
                ]);
                ctx.reply(`[Server: ${self.module.name}]\nПользователи с ником ${u.nickname}:\n${users.map(us => `tg://user?id=${us.id}`).join("\n")}`, { keyboard });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError("g", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}