import { Command } from '../../Command';
import { Module } from '../../Module';
import Util from '../../Util';
import BanchoPP from '../../pp/bancho';
import Mods from '../../pp/Mods';
import { APIUser, IDatabaseUser } from '../../Types';
import { ServerCommand } from './BasicServerCommand';

export default class AbstractTop extends ServerCommand {
    ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(["top", "t", "е", "ещз"], module, async (self) => {
            let mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
            let user = self.user.username 
                ? await self.module.api.getUser(self.user.username, mode) 
                : await self.module.api.getUserById(self.user.id || self.user.dbUser.game_id, mode);

            if (!this.ignoreDbUpdate) {
                self.module.db.updateInfo(user, mode);
            }

            if(self.args.apx) {
                let top = await self.module.api.getUserTopById(user.id, mode, 100);
                if(self.args.mods) {
                    let mods = new Mods(self.args.mods);
                    top = top.filter(score => score.mods.sum() == mods.sum());
                    if(!top[0]) return self.reply(`Не найдено топ скоров с указанной комбинацией модов!`);
                }
                let nearest = top[0];
                let place = 1;
                for(let i = 0; i < top.length; i++) {
                    if(Math.abs(top[i].pp - self.args.apx) < Math.abs(nearest.pp - self.args.apx)) {
                        nearest = top[i];
                        place = i+1;
                    }
                }
                let map = nearest.beatmap ?? await self.module.api.getBeatmap(nearest.beatmapId, mode, nearest.mods);
                let cover = await self.module.bot.database.covers.getCover(map.id.set);
                let calc = new BanchoPP(map, nearest.mods);
                self.module.bot.maps.setMap(self.ctx.peerId, map);
                self.reply(`Ближайшее к ${self.args.apx}pp\n${self.module.bot.templates.TopSingle(nearest, map, user, place, calc, self.module.link)}`, {
                    attachment: cover
                });
            } else if(self.args.more) {
                let top = await self.module.api.getUserTopById(user.id, mode, 100);
                if(self.args.mods) {
                    let mods = new Mods(self.args.mods);
                    top = top.filter(score => score.mods.sum() == mods.sum());
                    if(!top[0]) return self.reply(`\Не найдено топ скоров с указанной комбинацией модов!`);
                }
                let amount = top.filter(t => t.pp > self.args.more).length;
                self.reply(`У игрока ${user.nickname} ${amount ? amount : 'нет'}${amount == 100 ? '+' : ''} ${Util.scoreNum(amount)} выше ${self.args.more}pp`);
            } else if(self.args.place) {
                let score = (await self.module.api.getUserTopById(user.id, mode, self.args.place))[self.args.place - 1];
                let map = score.beatmap ?? await self.module.api.getBeatmap(score.beatmapId, mode, score.mods);
                let cover = await self.module.bot.database.covers.getCover(map.id.set);
                let calc = new BanchoPP(map, score.mods);
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
                
                self.reply(`${self.module.bot.templates.TopSingle(score, map, user, self.args.place, calc, self.module.link)}`, {
                    attachment: cover,
                    keyboard
                });
                self.module.bot.maps.setMap(self.ctx.peerId, map);
            } else {
                let top = await self.module.api.getUserTopById(user.id, mode, 100);
                if(self.args.mods) {
                    let mods = new Mods(self.args.mods);
                    top = top.filter(score => score.mods.sum() == mods.sum());
                    if(!top[0]) return self.reply(`Не найдено топ скоров с указанной комбинацией модов!`);
                }
                top = top.splice(0, 3);
                let maps = await Promise.all(top.map(s => s.beatmap ? Promise.resolve(s.beatmap) : self.module.api.getBeatmap(s.beatmapId, mode, s.mods)));
                let str = maps.map((map, i) => {
                    let calc = new BanchoPP(map, top[i].mods);
                    return self.module.bot.templates.TopScore(top[i], map, i+1, calc, self.module.link);
                }).join("\n");
                self.reply(`Топ скоры игрока ${user.nickname} [${Util.profileModes[mode]}]:\n${str}`);
            }
        }, true);

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
}