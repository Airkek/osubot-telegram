import { Command } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { SimpleCommandsModule } from "./index";
import { getScoreIdFromText } from "../../../osu_specific/regexes/ScoreRegexp";
import { IKeyboard } from "../../../Util";
import { InputFile } from "grammy";
import BanchoPP from "../../../osu_specific/pp/bancho";

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

            let message = ctx.tr("player-name", {
                player_name: user.nickname,
            });
            let cover: string | InputFile;
            if (await ctx.preferCardsOutput()) {
                cover = new InputFile(await module.bot.okiChanCards.generateScoreCard(score, map, ctx));
                const beatmapUrl = `https://osu.ppy.sh/b/${map.id}`;
                message += `\n\n${ctx.tr("score-beatmap-link")}: ${beatmapUrl}`;
            } else {
                const ppCalc = new BanchoPP(map, score.mods);
                if (map.coverUrl) {
                    cover = await module.bot.database.covers.getPhotoDoc(map.coverUrl);
                } else {
                    cover = await module.bot.database.covers.getCover(map.setId);
                }
                message += "\n\n" + module.bot.templates.ScoreFull(ctx, score, map, ppCalc, "https://osu.ppy.sh");
            }

            await ctx.reply(message, {
                photo: cover,
                keyboard: buttons,
            });
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
