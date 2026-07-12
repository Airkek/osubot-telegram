import { APIScore } from "../../Types";
import Util from "../../Util";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";
import { shouldDisplayPpEstimate } from "../../osu_specific/pp/PPDisplay";

export default async function (
    l: ILocalisator,
    score: APIScore,
    beatmap: IBeatmap,
    place: number,
    calc: ICalc,
    link: string
): Promise<string> {
    const pp = score.fcPp ? { pp: score.pp, fc: score.fcPp, ss: undefined } : await calc.calculate(score);
    const actualPp = score.pp ?? pp.pp;
    const fcPp = shouldDisplayPpEstimate(actualPp, pp.pp, pp.fc) ? ` → FC: ${pp.fc.toFixed(2)}` : "";

    return `#${place}
${Util.formatBeatmap(beatmap)} ${score.mods}
${l.tr("score-grade")}: ${score.rank} → ${Util.formatCombo(score.combo, beatmap.maxCombo)}
${l.tr("score-accuracy")}: ${(score.accuracy() * 100).toFixed(2)}% → ${score.counts}
PP: ${actualPp.toFixed(2)}${fcPp}
${Util.formatDate(score.date)}
${beatmap.url ?? `${link}/b/${beatmap.id}`}`;
}
