import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractFind extends ServerCommand {
    constructor(module: Module) {
        super(["find", "f", "а", "аштв"], module, async (self) => {
            if(!self.args.nickname[0])
                return self.reply("Укажите ник!");

            let u = await self.module.api.getUser(self.args.nickname.join(" "));
            let users = await self.module.db.findByUserId(u.id);
            if(!users[0])
                return self.reply("Не найдено пользователей с таким ником!");
            let keyboard = Util.createKeyboard([
                [{
                    text: 'Посмотреть профиль',
                    command: `${self.module.prefix[0]} user ${u.nickname}`
                }]
            ]);
            self.reply(`Пользователи с ником ${u.nickname}:\n${users.map(us => `tg://user?id=${us.id}`).join("\n")}`, { keyboard });
        });
    }
}