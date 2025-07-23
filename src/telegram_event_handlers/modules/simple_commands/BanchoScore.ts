import { Command } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { SimpleCommandsModule } from "./index";
import { getScoreIdFromText } from "../../../osu_specific/regexes/ScoreRegexp";
import { IKeyboard } from "../../../Util";

export class BanchoScore extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["bancho_score_link"], module, async (ctx: UnifiedMessageContext) => {
            const scoreId = getScoreIdFromText(ctx.text) || this.getScoreIdFromAttachments(ctx);
            const score = await module.bot.banchoApi.getScoreByScoreId(scoreId);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(score.beatmapId, score.mode);
            await map.applyMods(score.mods);
            const user = await module.bot.banchoApi.getUserById(score.player_id);
            module.bot.maps.setMap(ctx.chatId, map);

            const buttons: IKeyboard = [];
            if (score.has_replay && score.api_score_id) {
                const settingsAllowed = process.env.RENDER_REPLAYS === "true";
                if (settingsAllowed) {
                    const button = {
                        text: ctx.tr("render-replay-button"),
                        command: `render_bancho:${score.api_score_id}`,
                    };
                    buttons.push([button]);
                }
            }

            const message = ctx.tr("player-name", {
                player_name: user.nickname,
            });

            const replyData = await this.module.bot.replyUtils.scoreData(ctx, ctx, score, map, "https://osu.ppy.sh");
            await ctx.reply(message + "\n\n" + replyData.text, {
                keyboard: buttons,
                photo: replyData.photo,
            });

            this.module.bot.maps.setMap(ctx.chatId, map);
        });
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        const scoreId = getScoreIdFromText(ctx.text) || this.getScoreIdFromAttachments(ctx);
        return !!scoreId;
    }

    private getScoreIdFromAttachments(ctx: UnifiedMessageContext): number | null {
        return ctx.hasLinks() ? getScoreIdFromText(ctx.getLinks()[0].url) : null;
    }
}
