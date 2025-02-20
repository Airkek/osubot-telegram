import { APIScore, APIBeatmap } from '../Types';
import Util from '../Util';
import { IPPCalculator as ICalc } from '../pp/Calculator';

export default function(score: APIScore, beatmap: APIBeatmap, place: number, calc: ICalc, link: string) {
    return `#${place}
${Util.formatBeatmap(beatmap)} ${score.mods}
Grade: ${score.rank} → ${Util.formatCombo(score.combo, beatmap.combo)} → ${Util.formatBeatmapLength(beatmap.length / calc.speedMultiplier)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}% → ${score.counts}
PP: ${Util.round(score.pp, 2)}
${Util.formatDate(score.date)}
${beatmap.mapUrl ?? `${link}/b/${beatmap.id.map}`}`;
}