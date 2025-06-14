import { Command } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { SimpleCommandsModule } from "./index";
import { getScoreIdFromText } from "../../../osu_specific/regexes/ScoreRegexp";
import Calculator from "../../../osu_specific/pp/bancho";
import Util, { IKBButton } from "../../../Util";

export class BanchoScore extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["bancho_score_link"], module, async (ctx: UnifiedMessageContext) => {
            const scoreId = getScoreIdFromText(ctx.text) || this.getScoreIdFromAttachments(ctx);
            const score = await module.bot.banchoApi.getScoreByScoreId(scoreId);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(score.beatmapId, score.mode);
            await map.applyMods(score.mods);
            const user = await module.bot.banchoApi.getUserById(score.player_id);
            const cover = await module.bot.database.covers.getCover(map.setId);
            module.bot.maps.setMap(ctx.chatId, map);
            const calc = new Calculator(map, score.mods);

            const buttons: IKBButton[][] = [];
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

            await ctx.reply(
                `${ctx.tr("player-name", {
                    player_name: user.nickname,
                })}\n\n${module.bot.templates.ScoreFull(ctx, score, map, calc, "https://osu.ppy.sh")}`,
                {
                    photo: cover,
                    keyboard: buttons.length > 0 ? Util.createKeyboard(buttons) : undefined,
                }
            );
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
