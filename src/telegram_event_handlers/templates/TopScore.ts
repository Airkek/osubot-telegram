import { APIScore } from "../../Types";
import Util from "../../Util";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";

export default function (score: APIScore, beatmap: IBeatmap, place: number, calc: ICalc, link: string) {
    return `#${place}
${Util.formatBeatmap(beatmap)} ${score.mods}
Grade: ${score.rank} → ${Util.formatCombo(score.combo, beatmap.maxCombo)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}% → ${score.counts}
PP: ${Util.round(score.pp, 2)}
${Util.formatDate(score.date)}
${beatmap.url ?? `${link}/b/${beatmap.id}`}`;
}
