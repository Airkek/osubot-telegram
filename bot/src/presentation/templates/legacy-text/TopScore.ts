import { IGameScore } from "games/scores/IGameScore";
import { Util } from "shared/Util";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { IScorePpDisplay } from "games/osu/performance/IScorePpDisplay";
import { shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";

export function formatTopScore(
    l: ILocalizer,
    score: IGameScore,
    beatmap: IBeatmap,
    place: number,
    pp: IScorePpDisplay,
    link: string
): string {
    const fcPp = shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc) ? ` → FC: ${pp.fc!.toFixed(2)}` : "";
    const lines = [
        `#${place}`,
        `${Util.formatBeatmap(beatmap)} ${score.mods}`,
        `${l.tr("score-grade")}: ${score.rank} → ${Util.formatCombo(score.combo, beatmap.maxCombo)}`,
        `${l.tr("score-accuracy")}: ${(score.accuracy() * 100).toFixed(2)}% → ${score.counts}`,
    ];
    if (pp.actual !== undefined) {
        lines.push(`PP: ${pp.actual.toFixed(2)}${fcPp}`);
    }
    lines.push(Util.formatDate(score.date), beatmap.url ?? `${link}/b/${beatmap.id}`);
    return lines.join("\n");
}
