import { APIScore, APIBeatmap } from '../Types';
import Util from '../Util';
import { IPPCalculator as ICalc } from '../pp/Calculator';

export default function(score: APIScore, beatmap: APIBeatmap, calc: ICalc, link: string) {
    let pp = score.fcPp ? { pp: score.pp, fc: score.fcPp, ss: undefined } : calc.calculate(score);

    let ppString = `PP: ${pp.pp.toFixed(2)}`;
    if (pp.fc !== undefined && pp.fc != pp.pp) {
        ppString += ` → FC: ${pp.fc.toFixed(2)}`;
    }
    if (pp.ss !== undefined && pp.ss != pp.pp) {
        ppString += ` → SS: ${pp.ss.toFixed(2)}`;
    }

    let hits = beatmap.objects.circles + beatmap.objects.sliders + beatmap.objects.spinners;
    if(score.mode == 1)
        hits -= beatmap.objects.sliders;
    if(score.mode == 1 || score.mode == 3)
        hits -= beatmap.objects.spinners;
    let progress = score.counts.totalHits() / hits;
    let topscoreStr = score.top100_number ? `🏆 Персональный топскор #${score.top100_number}\n` : '';
    let rankStr = score.rank_global ? `#${score.rank_global} место по миру на карте\n` : '';
    if (score.rank_global && score.rank_global <= 100) {
        rankStr = "🏆 "+ rankStr;
    }
    return ` <${beatmap.status}> ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] by ${beatmap.creator.nickname}
${Util.formatBeatmapLength(beatmap.length / calc.speedMultiplier)} | ${beatmap.stats} ${Math.round(beatmap.bpm * calc.speedMultiplier)}BPM | ${Util.round(beatmap.diff.stars, 2)}✩ ${score.mods}

Score: ${score.score} | Combo: ${Util.formatCombo(score.combo, beatmap.combo)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}%
` + ppString + `
Hitcounts: ${score.counts.toString()}
Grade: ${score.rank} ${score.rank == "F" ? `(${Util.round(progress * 100, 2)}%)` : ''}
${rankStr}${topscoreStr}
Beatmap: ` + (beatmap.mapUrl ?? `${link}/b/${beatmap.id.map}`);
}