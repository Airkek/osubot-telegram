import { Module } from "../../Module";
import Util from "../../Util";
import BanchoPP from "../../pp/bancho";
import Mods from "../../pp/Mods";
import { ServerCommand } from "./BasicServerCommand";
import { Mode } from "../../Types";

export default class AbstractTop extends ServerCommand {
    ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(
            ["top", "t", "е", "ещз"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
                const user = self.user.username
                    ? await self.module.api.getUser(self.user.username, mode)
                    : await self.module.api.getUserById(self.user.id || self.user.dbUser.game_id, mode);

                if (!this.ignoreDbUpdate) {
                    self.module.db.updateInfo(user, mode);
                }

                if (self.args.apx) {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if (self.args.mods) {
                        const mods = new Mods(self.args.mods);
                        top = top.filter((score) => score.mods.sum() == mods.sum());
                        if (!top[0]) {
                            await self.reply("Не найдено топ скоров с указанной комбинацией модов!");
                            return;
                        }
                    }
                    let nearest = top[0];
                    for (let i = 0; i < top.length; i++) {
                        if (Math.abs(top[i].pp - self.args.apx) < Math.abs(nearest.pp - self.args.apx)) {
                            nearest = top[i];
                            top[i].top100_number = i + 1;
                        }
                    }

                    const map =
                        nearest.beatmap ?? (await self.module.api.getBeatmap(nearest.beatmapId, mode, nearest.mods));
                    const cover = await self.module.bot.database.covers.getCover(map.id.set);
                    const calc = new BanchoPP(map, nearest.mods);
                    self.module.bot.maps.setMap(self.ctx.peerId, map);
                    await self.reply(
                        `Ближайший к ${self.args.apx}pp скор игрока ${user.nickname} (${Mode[nearest.mode]}):\n${self.module.bot.templates.ScoreFull(nearest, map, calc, self.module.link)}`,
                        {
                            attachment: cover,
                        }
                    );
                } else if (self.args.more) {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if (self.args.mods) {
                        const mods = new Mods(self.args.mods);
                        top = top.filter((score) => score.mods.sum() == mods.sum());
                        if (!top[0]) {
                            await self.reply("Не найдено топ скоров с указанной комбинацией модов!");
                            return;
                        }
                    }
                    const amount = top.filter((t) => t.pp > self.args.more).length;
                    await self.reply(
                        `У игрока ${user.nickname} ${amount ? amount : "нет"}${amount == 100 ? "+" : ""} ${Util.scoreNum(amount)} выше ${self.args.more}pp`
                    );
                } else if (self.args.place) {
                    const score = (await self.module.api.getUserTopById(user.id, mode, self.args.place))[
                        self.args.place - 1
                    ];
                    const map = score.beatmap ?? (await self.module.api.getBeatmap(score.beatmapId, mode, score.mods));
                    const cover = await self.module.bot.database.covers.getCover(map.id.set);
                    const calc = new BanchoPP(map, score.mods);
                    const keyboard =
                        self.module.api.getScore !== undefined
                            ? Util.createKeyboard([
                                  [
                                      {
                                          text: `[${self.module.prefix[0].toUpperCase()}] Мой скор на карте`,
                                          command: `{map${map.id.map}}${self.module.prefix[0]} c`,
                                      },
                                  ],
                                  self.ctx.isChat
                                      ? [
                                            {
                                                text: `[${self.module.prefix[0].toUpperCase()}] Топ чата на карте`,
                                                command: `{map${map.id.map}}${self.module.prefix[0]} lb`,
                                            },
                                        ]
                                      : [],
                              ])
                            : undefined;

                    await self.reply(
                        `Топ #${self.args.place} скор игрока ${user.nickname} (${Mode[score.mode]}):\n${self.module.bot.templates.ScoreFull(score, map, calc, self.module.link)}`,
                        {
                            attachment: cover,
                            keyboard,
                        }
                    );
                    self.module.bot.maps.setMap(self.ctx.peerId, map);
                } else {
                    let top = await self.module.api.getUserTopById(user.id, mode, 100);
                    if (self.args.mods) {
                        const mods = new Mods(self.args.mods);
                        top = top.filter((score) => score.mods.sum() == mods.sum());
                        if (!top[0]) {
                            await self.reply("Не найдено топ скоров с указанной комбинацией модов!");
                            return;
                        }
                    }
                    top = top.splice(0, 3);
                    const maps = await Promise.all(
                        top.map((s) =>
                            s.beatmap
                                ? Promise.resolve(s.beatmap)
                                : self.module.api.getBeatmap(s.beatmapId, mode, s.mods)
                        )
                    );
                    const str = maps
                        .map((map, i) => {
                            const calc = new BanchoPP(map, top[i].mods);
                            return self.module.bot.templates.TopScore(top[i], map, i + 1, calc, self.module.link);
                        })
                        .join("\n");
                    await self.reply(`Топ скоры игрока ${user.nickname} [${Util.profileModes[mode]}]:\n${str}`);
                }
            },
            true
        );

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
}
