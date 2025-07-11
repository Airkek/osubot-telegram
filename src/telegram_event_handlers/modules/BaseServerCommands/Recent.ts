import { ServerModule } from "../Module";
import Calculator from "../../../osu_specific/pp/bancho";
import { IKeyboard } from "../../../Util";
import { ServerCommand } from "../../ServerCommand";
import { APIScore } from "../../../Types";
import { InputFile } from "grammy";
import { IBeatmap } from "../../../beatmaps/BeatmapTypes";

export default class AbstractRecent extends ServerCommand {
    constructor(module: ServerModule) {
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

                let map: IBeatmap = recent.beatmap;
                if (!map) {
                    map = await self.module.beatmapProvider.getBeatmapById(recent.beatmapId, recent.mode);
                    await map.applyMods(recent.mods);
                }

                const keyboard: IKeyboard = [];
                if (self.module.api.getScore !== undefined) {
                    const firstButton = {
                        text: `[${self.module.prefix[0].toUpperCase()}] ${self.ctx.tr("my-score-on-map-button")}`,
                        command: `{map${map.id}}${self.module.prefix[0]} c`,
                    };

                    keyboard.push([firstButton]);

                    if (self.ctx.isInGroupChat) {
                        const secondButton = {
                            text: `[${self.module.prefix[0].toUpperCase()}] ${self.ctx.tr("chat-map-leaderboard-button")}`,
                            command: `{map${map.id}}${self.module.prefix[0]} lb`,
                        };
                        keyboard.push([secondButton]);
                    }

                    if (recent.has_replay && recent.api_score_id) {
                        const settingsAllowed = process.env.RENDER_REPLAYS === "true";
                        if (settingsAllowed) {
                            const thirdButton = {
                                text: self.ctx.tr("render-replay-button"),
                                command: `render_bancho:${recent.api_score_id}`,
                            };
                            keyboard.push([thirdButton]);
                        }
                    }
                }

                let responseMessage = "";

                let cover: string | InputFile;
                if (await self.ctx.preferCardsOutput()) {
                    cover = new InputFile(await self.module.bot.okiChanCards.generateScoreCard(recent, map, self.ctx));
                    const beatmapUrl = map.url ?? `${self.module.link}/b/${map.id}`;
                    responseMessage += `${self.ctx.tr("score-beatmap-link")}: ${beatmapUrl}`;
                } else {
                    const calculator = new Calculator(map, recent.mods);
                    if (map.coverUrl) {
                        cover = await self.module.bot.database.covers.getPhotoDoc(map.coverUrl);
                    } else {
                        cover = await self.module.bot.database.covers.getCover(map.setId);
                    }
                    responseMessage = self.module.bot.templates.ScoreFull(
                        self.ctx,
                        recent,
                        map,
                        calculator,
                        self.module.link
                    );
                }
                await self.reply(responseMessage, {
                    photo: cover,
                    keyboard: keyboard,
                });

                self.module.bot.maps.setMap(self.ctx.chatId, map);
            },
            true
        );
    }
}
