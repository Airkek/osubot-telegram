import { IMessageContext } from "core/IMessageContext";
import { Command } from "commands/Command";
import { SimpleCommandsModule } from "commands/modules/simple/SimpleCommandsModule";
import { getScoreIdFromText } from "games/osu/parsing/ScoreRegexp";
import { IKeyboardRow } from "presentation/keyboard/IKeyboardRow";
import { makeKeyboard } from "presentation/keyboard/makeKeyboard";

export class BanchoScore extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["bancho_score_link"], module, async (ctx: IMessageContext) => {
            const scoreId = getScoreIdFromText(ctx.text) || this.getScoreIdFromAttachments(ctx);
            const score = await module.bot.api.bancho.getScoreByScoreId(scoreId);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(score.beatmapId, score.mode);
            await map.applyMods(score.mods);
            const user = await module.bot.api.bancho.getUserById(score.player_id);
            module.bot.chatBeatmaps.setMap(ctx.chatId, map);

            const buttons: IKeyboardRow[] = [];
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

            const replyData = await this.module.bot.replies.scoreData(ctx, ctx, score, map, "https://osu.ppy.sh");
            await ctx.reply(message + "\n\n" + replyData.text, {
                keyboard: makeKeyboard(buttons),
                photo: replyData.photo,
            });

            this.module.bot.chatBeatmaps.setMap(ctx.chatId, map);
        });
    }

    check(name: string, ctx: IMessageContext): boolean {
        const scoreId = getScoreIdFromText(ctx.text) || this.getScoreIdFromAttachments(ctx);
        return !!scoreId;
    }

    private getScoreIdFromAttachments(ctx: IMessageContext): number | null {
        return ctx.hasLinks() ? getScoreIdFromText(ctx.getLinks()[0].url) : null;
    }
}
