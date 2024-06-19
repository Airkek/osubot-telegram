import { Command } from "../../Command";
import { Module } from "../../Module";
import Calculator from '../../pp/bancho';
import { APIUser, IDatabaseUser } from "../../Types";
import Util from "../../Util";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractRecent extends ServerCommand {
    constructor(module: Module) {
        super(["recent", "r", "rp", "к", "кз", "кусуте"], module, async (self) => {
            let userId: number = null;
            let dbUser: IDatabaseUser = undefined;
            if (self.args.nickname[0]) {
                userId = (await self.module.api.getUser(self.args.nickname.join(" "))).id;
            } else {
                if(self.ctx.hasReplyMessage) {
                    dbUser = await self.module.db.getUser(self.ctx.replyMessage.senderId);

                    if(!dbUser.nickname) {
                        return self.reply(`У этого пользователя не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }                    
                } else {
                    dbUser = await self.module.db.getUser(self.ctx.senderId);

                    if(!dbUser.nickname) {
                        return self.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }
                }

                userId = dbUser.uid;
            }
            
            let mode = self.args.mode === null ? dbUser?.mode || 0 : self.args.mode;

            let recent = await self.module.api.getUserRecentById(userId, mode, 1);
            let map = await self.module.bot.api.v2.getBeatmap(recent.beatmapId, recent.mode, recent.mods.diff());
            let cover = await self.module.bot.database.covers.getCover(map.id.set);
            let calc = new Calculator(map, recent.mods);
            let keyboard = self.module.api.getScore !== undefined ? Util.createKeyboard([
                [{
                    text: `[${self.module.prefix[0].toUpperCase()}] Мой скор на карте`,
                    command: `{map${map.id.map}}${self.module.prefix[0]} c`
                }],
                self.ctx.isChat ? [{
                    text: `[${self.module.prefix[0].toUpperCase()}] Топ чата на карте`,
                    command: `{map${map.id.map}}${self.module.prefix[0]} lb`
                }] : []
            ]) : undefined;
            self.reply(`${self.module.bot.templates.RecentScore(recent, map, calc, self.module.link)}`, {
                attachment: cover,
                keyboard
            });
            self.module.bot.maps.setMap(self.ctx.peerId, map);
        });
    }
}