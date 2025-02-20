import { Module } from '../../Module';
import { ServerCommand } from './BasicServerCommand';

export default class AbstractNick extends ServerCommand {
    constructor(module: Module) {
        super(['nick', 'n', 'т', 'тшсл'], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(`Не указан ник!\nИспользование: ${module.prefix[0]} nick <ник>`);
                return;
            }
            try {
                const user = await self.module.api.getUser(self.args.nickname.join(' '));
                await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname, user.mode);
                await self.reply(`Установлен ник: ${user.nickname}`);
            } catch {
                await self.reply('Такого пользователя не существует!');
            }
        });
    }
}