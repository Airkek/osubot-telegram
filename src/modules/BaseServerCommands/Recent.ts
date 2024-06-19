import { Command } from "../../Command";
import { Module } from "../../Module";
import Calculator from '../../pp/bancho';
import { APIUser, IDatabaseUser } from "../../Types";
import Util from "../../Util";

export default class AbstractRecent extends Command {
    constructor(module: Module) {
        super(["recent", "r", "rp", "к", "кз", "кусуте"], module, async (ctx, self, args) => {
            let userId: number = null;
            let dbUser: IDatabaseUser = undefined;
            if (args.nickname[0]) {
                userId = (await self.module.api.getUser(args.nickname.join(" "))).id;
            } else {
                if(ctx.hasReplyMessage) {
                    dbUser = await self.module.db.getUser(ctx.replyMessage.senderId);

                    if(!dbUser.nickname) {
                        return ctx.reply(`У этого пользователя не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }                    
                } else {
                    dbUser = await self.module.db.getUser(ctx.senderId);

                    if(!dbUser.nickname) {
                        return ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }
                }

                userId = dbUser.uid;
            }
            
            let mode = args.mode === null ? dbUser?.mode || 0 : args.mode;
            try {
                let recent = await self.module.api.getUserRecentById(userId, mode, 1);
                let map = await self.module.bot.api.v2.getBeatmap(recent.beatmapId, recent.mode, recent.mods.diff());
                let cover = await self.module.bot.database.covers.getCover(map.id.set);
                let calc = new Calculator(map, recent.mods);
                let keyboard = self.module.api.getScore !== undefined ? Util.createKeyboard([
                    [{
                        text: `[${self.module.prefix[0].toUpperCase()}] Мой скор на карте`,
                        command: `{map${map.id.map}}${self.module.prefix[0]} c`
                    }],
                    ctx.isChat ? [{
                        text: `[${self.module.prefix[0].toUpperCase()}] Топ чата на карте`,
                        command: `{map${map.id.map}}${self.module.prefix[0]} lb`
                    }] : []
                ]) : undefined;
                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.RecentScore(recent, map, calc, self.module.link)}`, {
                    attachment: cover,
                    keyboard
                });
                self.module.bot.maps.setMap(ctx.peerId, map);
            } catch(e) {
                let err = await self.module.bot.database.errors.addError(self.module.prefix[0], ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}