import { Command } from "../../Command";
import { Module } from "../../Module";
import Calculator from '../../pp/bancho';
import Util from "../../Util";

export default class AbstractRecent extends Command {
    constructor(module: Module) {
        super(["recent", "r", "rp", "к", "кз", "кусуте"], module, async (ctx, self, args) => {
            let dbUser = await self.module.db.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.db.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.db.getUser(ctx.forwards[0].senderId)).nickname;
            if(!dbUser.nickname && !args.nickname[0])
                return ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
            let mode = args.mode === null ? dbUser.mode || 0 : args.mode;
            try {
                let recent = await self.module.api.getUserRecent(dbUser.nickname, mode, 1);
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