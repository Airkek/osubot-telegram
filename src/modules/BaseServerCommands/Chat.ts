import { Module } from '../../Module';
import Util from '../../Util';
import { ServerCommand } from './BasicServerCommand';

export default class AbstractChat extends ServerCommand {
    constructor(module: Module) {
        super(['chat', 'срфе'], module, async (self) => {
            let id = self.ctx.chatId;
            if (self.args.string[0]) {
                id = parseInt(self.args.string[0]);
                if (isNaN(id)) {
                    await self.reply('Некорректный ID!');
                    return;
                }
                
            } else if (!self.ctx.isChat) {
                await self.reply('Укажите ID беседы!');
                return;
            }

            const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
            
            const members = await self.module.bot.database.chats.getChatUsers(id);
            let users = [];
            for (let i = 0; i < members.length; i++) {
                const u = await self.module.db.getUserStats(members[i], mode);
                if (u.id && !users.some((uu) => uu.id == u.id)) {
                    users.push(u);
                }
                
            }
            users = users.filter((a) => a.rank > 0 && a.pp > 0);
            users.sort((a,b) => {
                if (a.rank > b.rank) {
                    return 1;
                } else if (a.rank < b.rank) {
                    return -1;
                }
                return 0;
            });

            let modeStr = 'STD';
            if (mode === 1) {
                modeStr = 'Taiko';
            } else if (mode === 2) {
                modeStr = 'CTB';
            } else if (mode === 3) {
                modeStr = 'Mania';
            }
            
            await self.reply(`Топ${users.length > 15 ? '-15' : ''} беседы (ID ${id}) [${modeStr}]:\n${users.splice(0, 15).map((user, i) => `#${i+1} ${user.nickname} | ${Util.round(user.pp, 1)}pp | Ранк ${user.rank} | ${Util.round(user.acc, 2)}%`).join('\n')}`);
        });
    }
}