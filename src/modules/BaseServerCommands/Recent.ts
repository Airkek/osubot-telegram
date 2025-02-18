import { InputFile } from "grammy";
import { Command } from "../../Command";
import { Module } from "../../Module";
import Calculator from '../../pp/bancho';
import { APIUser, IDatabaseUser } from "../../Types";
import Util from "../../Util";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractRecent extends ServerCommand {
    constructor(module: Module) {
        super(["recent", "r", "rp", "к", "кз", "кусуте"], module, async (self) => {
            let mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
            let recent = self.user.username 
                ? await self.module.api.getUserRecent(self.user.username, mode, 1) 
                : await self.module.api.getUserRecentById(self.user.id || self.user.dbUser.game_id, mode, 1);

            let map = recent.beatmap ?? await self.module.api.getBeatmap(recent.beatmapId, recent.mode, recent.mods);
            
            let cover = map.coverUrl ? await self.module.bot.database.covers.getPhotoDoc(map.coverUrl) : await self.module.bot.database.covers.getCover(map.id.set);
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
        }, true);
    }
}