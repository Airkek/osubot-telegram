import { APIScore } from "../../Types";
import Util from "../../Util";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";

export default function (
    l: ILocalisator,
    score: APIScore,
    beatmap: IBeatmap,
    place: number,
    calc: ICalc,
    link: string
) {
    return `#${place}
${Util.formatBeatmap(beatmap)} ${score.mods}
${l.tr("score-grade")}: ${score.rank} → ${Util.formatCombo(score.combo, beatmap.maxCombo)}
${l.tr("score-accuracy")}: ${(score.accuracy() * 100).toFixed(2)}% → ${score.counts}
PP: ${Util.round(score.pp, 2)}
${Util.formatDate(score.date)}
${beatmap.url ?? `${link}/b/${beatmap.id}`}`;
}
