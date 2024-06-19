import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class AbstractFind extends Command {
    constructor(module: Module) {
        super(["find", "f", "а", "аштв"], module, async (ctx, self, args) => {
            if(!args.nickname[0])
                return ctx.reply("Укажите ник!");
            try {
                let u = await self.module.api.getUser(args.nickname.join(" "));
                let users = await self.module.db.findByUserId(u.id);
                if(!users[0])
                    return ctx.reply("Не найдено пользователей с таким ником!");
                let keyboard = Util.createKeyboard([
                    [{
                        text: 'Посмотреть профиль',
                        command: `${self.module.prefix[0]} user ${u.nickname}`
                    }]
                ]);
                ctx.reply(`[Server: ${self.module.name}]\nПользователи с ником ${u.nickname}:\n${users.map(us => `tg://user?id=${us.id}`).join("\n")}`, { keyboard });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError(self.module.prefix[0], ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}