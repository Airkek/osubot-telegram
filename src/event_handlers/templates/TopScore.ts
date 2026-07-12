import { APIScore } from "../../Types";
import Util from "../../Util";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { resolveScorePp, shouldDisplayPpEstimate } from "../../osu_specific/pp/PPDisplay";

export default async function (
    l: ILocalisator,
    score: APIScore,
    beatmap: IBeatmap,
    place: number,
    calc: ICalc,
    link: string
): Promise<string> {
    const pp = await resolveScorePp(score, calc);
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
