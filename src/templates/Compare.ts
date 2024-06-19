import { APIScore, APIBeatmap } from '../Types';
import Util from '../Util';
import { IPPCalculator as ICalc } from '../pp/Calculator';

export default function(score: APIScore, map: APIBeatmap, calc: ICalc) {
    let pp = calc.calculate(score);
    return `Top score on ${map.artist} - ${map.title} [${map.version}] by ${map.creator.nickname}
${Util.formatBeatmapLength(map.length / calc.speedMultiplier)} | ${map.stats} ${Math.round(map.bpm * calc.speedMultiplier)}BPM | ${Util.round(map.diff.stars, 2)}✩ ${score.mods}

${Util.formatDate(score.date)}
Score: ${score.score} | Combo: ${Util.formatCombo(score.combo, map.combo)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}%
PP: ${score.pp !== undefined ? score.pp : Util.round(pp.pp, 2)}${pp.ss == pp.pp ? '' : pp.fc == pp.pp ? ` ⯈ SS: ${Util.round(pp.ss, 2)}` : ` ⯈ FC: ${Util.round(pp.fc, 2)} ⯈ SS: ${Util.round(pp.ss, 2)}`}
Hitcounts: ${score.counts}
Grade: ${score.rank}`;
}