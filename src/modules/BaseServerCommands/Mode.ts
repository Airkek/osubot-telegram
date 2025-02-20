import { Module } from '../../Module';
import { ServerCommand } from './BasicServerCommand';

export default class AbstractMode extends ServerCommand {
    constructor(module: Module) {
        super(['mode', 'm', 'ь', 'ьщву'], module, async (self) => {
            if (!self.args.full[0]) {
                await self.reply(`Не указан режим!\nИспользование: ${self.module.prefix[0]} mode <mode>\nДоступные моды:\n0 - osu!\n1 - Taiko\n2 - Fruits\n3 - Mania`);
                return;
            }
            
            const mode = self.args.full[0];
            let m = parseInt(mode);
            switch (mode) {
            case 'osu':
            case 'osu!':
            case 'standard':
            case 'std':
                m = 0;
                break;
                
            case 'taiko':
            case 'drums':
                m = 1;
                break;
                
            case 'fruits':
            case 'ctb':
                m = 2;
                break;

            case 'mania':
            case 'piano':
                m = 3;
                break;
            }
            if (isNaN(m) || m > 3 || m < 0) {
                await self.reply('Некорректный режим!\nДоступные моды:\n0 - osu!\n1 - Taiko\n2 - Fruits\n3 - Mania');
                return;
            }
            await self.module.db.setMode(self.ctx.senderId, m);
            await self.reply('Режим установлен!');
        });
    }
}