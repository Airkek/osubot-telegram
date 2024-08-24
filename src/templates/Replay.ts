import { Replay } from '../Replay';
import { APIBeatmap } from '../Types';
import Util from '../Util';
import { IPPCalculator as ICalc } from '../pp/Calculator';

export default function(replay: Replay, map: APIBeatmap, calc: ICalc) {
    let pp = calc.calculate(replay);
    return `${replay.player}'s replay:

${map.artist} - ${map.title} [${map.version}] by ${map.creator.nickname}
${Util.formatBeatmapLength(map.length / calc.speedMultiplier)} | ${map.stats} ${Math.round(map.bpm * calc.speedMultiplier)}BPM | ${Util.round(map.diff.stars, 2)}✩ ${replay.mods}

Score: ${replay.score} | Combo: ${Util.formatCombo(replay.combo, map.combo)}
Accuracy: ${Util.round(replay.accuracy() * 100, 2)}%
PP: ${pp.pp.toFixed(2)}${pp.ss == pp.pp ? '' : pp.fc == pp.pp ? ` → SS: ${pp.ss.toFixed(2)}` : ` → FC: ${pp.fc.toFixed(2)} → SS: ${pp.ss.toFixed(2)}`}
Hitcounts: ${replay.counts.toString()}`;
}