import { ServerModule } from "../Module";
import Mods from "../../../osu_specific/pp/Mods";
import { ServerCommand } from "../../ServerCommand";
import { IBeatmap } from "../../../beatmaps/BeatmapTypes";
import { IKeyboard } from "../../../Util";

export default class AbstractCompare extends ServerCommand {
    constructor(module: ServerModule) {
        super(
            ["compare", "c", "с", "сщьзфку"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
                const chat = self.module.bot.maps.getChat(self.ctx.chatId);
                if (!chat) {
                    await self.ctx.reply(self.ctx.tr("send-beatmap-first"));
                    return;
                }
                const score = self.user.username
                    ? await self.module.api.getScore(
                          self.user.username,
                          chat.map.id,
                          mode,
                          self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum()
                      )
                    : await self.module.api.getScoreByUid(
                          self.user.id || self.user.dbUser.game_id,
                          chat.map.id,
                          mode,
                          self.args.mods.length == 0 ? undefined : new Mods(self.args.mods).sum()
                      );
                let map: IBeatmap = score.beatmap;
                if (!map) {
                    map = await self.module.beatmapProvider.getBeatmapById(chat.map.id, score.mode);
                    await map.applyMods(score.mods);
                }

                const buttons: IKeyboard = [];
                if (score.has_replay && score.api_score_id) {
                    const settingsAllowed = process.env.RENDER_REPLAYS === "true";
                    if (settingsAllowed) {
                        const button = {
                            text: self.ctx.tr("render-replay-button"),
                            command: `render_bancho:${score.api_score_id}`,
                        };
                        buttons.push([button]);
                    }
                }

                const message = self.ctx.tr("best-players-score-on-this-beatmap");
                const replyData = await this.module.bot.replyUtils.scoreData(
                    self.ctx,
                    self.ctx,
                    score,
                    map,
                    self.module.link
                );
                await self.reply(message + "\n\n" + replyData.text, {
                    keyboard: buttons,
                    photo: replyData.photo,
                });

                self.module.bot.maps.setMap(self.ctx.chatId, map);
            },
            true
        );
    }
}
