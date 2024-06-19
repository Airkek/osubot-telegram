import { Command } from '../../Command';
import { Module } from '../../Module';
import Util from '../../Util';
import BanchoPP from '../../pp/bancho';
import Mods from '../../pp/Mods';
import { APIUser, IDatabaseUser } from '../../Types';

export default class AbstractTop extends Command {
    ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(["top", "t", "е", "ещз"], module, async (ctx, self, args) => {
            let user: APIUser = undefined;
            let dbUser: IDatabaseUser = undefined;
            if (args.nickname[0]) {
                user = await self.module.api.getUser(args.nickname.join(" "));
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

                user = await self.module.api.getUserById(dbUser.uid);
            }
            
            let mode = args.mode === null ? dbUser?.mode || 0 : args.mode;
            try {
                if (!this.ignoreDbUpdate) {
                    self.module.db.updateInfo(user, mode);
                }
                let status = self.module.bot.donaters.status(self.module.statusGetter, user.id);
                if(args.apx) {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if(args.mods) {
                        let mods = new Mods(args.mods);
                        top = top.filter(score => score.mods.sum() == mods.sum());
                        if(!top[0]) return ctx.reply(`[Server: ${self.module.name}] Не найдено топ скоров с указанной комбинацией модов!`);
                    }
                    let nearest = top[0];
                    let place = 1;
                    for(let i = 0; i < top.length; i++) {
                        if(Math.abs(top[i].pp - args.apx) < Math.abs(nearest.pp - args.apx)) {
                            nearest = top[i];
                            place = i+1;
                        }
                    }
                    let map = await self.module.bot.api.v2.getBeatmap(nearest.beatmapId, mode, nearest.mods.diff());
                    let cover = await self.module.bot.database.covers.getCover(map.id.set);
                    let calc = new BanchoPP(map, nearest.mods);
                    self.module.bot.maps.setMap(ctx.peerId, map);
                    ctx.reply(`[Server: ${self.module.name}] Ближайшее к ${args.apx}pp\n${self.module.bot.templates.TopSingle(nearest, map, user, place, calc, self.module.link, status)}`, {
                        attachment: cover
                    });
                } else if(args.more) {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if(args.mods) {
                        let mods = new Mods(args.mods);
                        top = top.filter(score => score.mods.sum() == mods.sum());
                        if(!top[0]) return ctx.reply(`[Server: ${self.module.name}] Не найдено топ скоров с указанной комбинацией модов!`);
                    }
                    let amount = top.filter(t => t.pp > args.more).length;
                    ctx.reply(`[Server: ${self.module.name}]\nУ игрока ${user.nickname} ${amount ? amount : 'нет'}${amount == 100 ? '+' : ''} ${Util.scoreNum(amount)} выше ${args.more}pp`);
                } else if(args.place) {
                    let score = (await self.module.api.getUserTopById(user.id, mode, args.place))[args.place - 1];
                    let map = await self.module.bot.api.v2.getBeatmap(score.beatmapId, mode, score.mods.diff());
                    let cover = await self.module.bot.database.covers.getCover(map.id.set);
                    let calc = new BanchoPP(map, score.mods);
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
                    
                    ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.TopSingle(score, map, user, args.place, calc, self.module.link, status)}`, {
                        attachment: cover,
                        keyboard
                    });
                    self.module.bot.maps.setMap(ctx.peerId, map);
                } else {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if(args.mods) {
                        let mods = new Mods(args.mods);
                        top = top.filter(score => score.mods.sum() == mods.sum());
                        if(!top[0]) return ctx.reply(`[Server: ${self.module.name}] Не найдено топ скоров с указанной комбинацией модов!`);
                    }
                    top = top.splice(0, 3);
                    let maps = await Promise.all(top.map(s => self.module.bot.api.v2.getBeatmap(s.beatmapId, mode, s.mods.diff())));
                    let str = maps.map((map, i) => {
                        let calc = new BanchoPP(map, top[i].mods);
                        return self.module.bot.templates.TopScore(top[i], map, i+1, calc, self.module.link);
                    }).join("\n");
                    ctx.reply(`[Server: ${self.module.name}]\nТоп скоры игрока ${user.nickname} ${status} [${Util.profileModes[mode]}]:\n${str}`);
                }
            } catch(e) {
                let err = await self.module.bot.database.errors.addError(self.module.prefix[0], ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
}