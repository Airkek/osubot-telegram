import { Module } from "../../Module";
import Calculator from "../../pp/bancho";
import Util from "../../Util";
import { ServerCommand } from "./BasicServerCommand";
import { APIBeatmap, APIScore } from "../../Types";
import { InlineKeyboard } from "grammy";

export default class AbstractRecent extends ServerCommand {
    constructor(module: Module) {
        super(
            ["recent", "r", "rp", "к", "кз", "кусуте"],
            module,
            async (self) => {
                let mode = 0;
                if (self.args.mode !== null) {
                    mode = self.args.mode;
                } else if (self.user.dbUser) {
                    mode = self.user.dbUser.mode || 0;
                }

                let recent: APIScore;
                if (self.user.username) {
                    recent = await self.module.api.getUserRecent(self.user.username, mode, 1);
                } else {
                    const userId = self.user.id || self.user.dbUser.game_id;
                    recent = await self.module.api.getUserRecentById(userId, mode, 1);
                }

                let map: APIBeatmap = recent.beatmap;
                if (!map) {
                    map = await self.module.api.getBeatmap(recent.beatmapId, recent.mode, recent.mods);
                }

                let cover: string;
                if (map.coverUrl) {
                    cover = await self.module.bot.database.covers.getPhotoDoc(map.coverUrl);
                } else {
                    cover = await self.module.bot.database.covers.getCover(map.id.set);
                }

                const calculator = new Calculator(map, recent.mods);

                let keyboard: InlineKeyboard;
                if (self.module.api.getScore !== undefined) {
                    const firstButton = {
                        text: `[${self.module.prefix[0].toUpperCase()}] Мой скор на карте`,
                        command: `{map${map.id.map}}${self.module.prefix[0]} c`,
                    };

                    const keyboardRows = [[firstButton]];

                    if (self.ctx.isChat) {
                        const secondButton = {
                            text: `[${self.module.prefix[0].toUpperCase()}] Топ чата на карте`,
                            command: `{map${map.id.map}}${self.module.prefix[0]} lb`,
                        };
                        keyboardRows.push([secondButton]);
                    }

                    keyboard = Util.createKeyboard(keyboardRows);
                }

                const responseMessage = self.module.bot.templates.ScoreFull(recent, map, calculator, self.module.link);

                await self.reply(responseMessage, {
                    attachment: cover,
                    keyboard: keyboard,
                });

                self.module.bot.maps.setMap(self.ctx.peerId, map);
            },
            true
        );
    }
}
