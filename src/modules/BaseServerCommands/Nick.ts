import { Command } from '../../Command';
import { Module } from '../../Module';
import { ServerCommand } from './BasicServerCommand';

export default class AbstractNick extends ServerCommand {
    constructor(module: Module) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            if(!self.args.nickname[0])
                return self.reply(`Не указан ник!\nИспользование: ${module.prefix[0]} nick <ник>`);
            try {
                let user = await self.module.api.getUser(self.args.nickname.join(" "));
                await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname);
                if (user.mode) {
                    await self.module.db.setMode(self.ctx.senderId, user.mode)
                }
                self.reply(`Установлен ник: ${user.nickname}`);
            } catch(err) {
                self.reply("Такого пользователя не существует!");
            }
        });
    }
}