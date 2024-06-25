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
            let mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
            let chat = self.module.bot.maps.getChat(self.ctx.peerId);
            if(!chat)
                return self.ctx.reply("Сначала отправьте карту!");
            let score = self.user.username 
                ? await self.module.api.getScore(self.user.username, chat.map.id.map, mode, self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum())
                : await self.module.api.getScoreByUid(self.user.id || self.user.dbUser.id, chat.map.id.map, mode, self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum());
            let map = await self.module.api.getBeatmap(chat.map.id.map, mode, score.mods.diff());
            let cover = await self.module.bot.database.covers.getCover(map.id.set);
            let calc = new Calculator(map, score.mods);
            self.reply(`${self.module.bot.templates.Compare(score, map, calc)}`, {
                attachment: cover
            });
        }, true);
    }
}