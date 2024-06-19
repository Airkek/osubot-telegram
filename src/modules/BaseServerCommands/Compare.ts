import { Command } from "../../Command";
import { Module } from "../../Module";
import Mods from "../../pp/Mods";
import Calculator from '../../pp/bancho';
import Util from "../../Util";
import { IDatabaseUser } from "../../Types";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractCompare extends ServerCommand {
    constructor(module: Module) {
        super(["compare", "c", "с", "сщьзфку"], module, async (self) => {
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
            let chat = self.module.bot.maps.getChat(self.ctx.peerId);
            if(!chat)
                return self.ctx.reply("Сначала отправьте карту!");
            let score = await self.module.api.getScoreByUid(userId, chat.map.id.map, mode, self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum());
            let map = await self.module.bot.api.v2.getBeatmap(chat.map.id.map, mode, score.mods.diff());
            let cover = await self.module.bot.database.covers.getCover(map.id.set);
            let calc = new Calculator(map, score.mods);
            self.reply(`${self.module.bot.templates.Compare(score, map, calc)}`, {
                attachment: cover
            });
        });
    }
}