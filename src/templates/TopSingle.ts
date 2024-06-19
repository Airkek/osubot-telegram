import { APIScore, APIBeatmap, APIUser, Mode } from "../Types";
import Util from "../Util";
import { IPPCalculator as ICalc } from '../pp/Calculator';

let f=(n)=>n<10?`0${n}`:`${n}`;

export default function(score: APIScore, beatmap: APIBeatmap, user: APIUser, place: number, calc: ICalc, link: string, status?: string) {
    return `Топ #${place} плей игрока ${user.nickname}${status?' '+status:''} (${Mode[score.mode]}):
${beatmap.artist} - ${beatmap.title} [${beatmap.version}] by ${beatmap.creator.nickname}
${Util.formatBeatmapLength(beatmap.length / calc.speedMultiplier)} | ${beatmap.stats} ${Math.round(beatmap.bpm * calc.speedMultiplier)}BPM | ${Util.round(beatmap.diff.stars, 2)}✩ ${score.mods}

${Util.formatDate(score.date)}
Score: ${score.score} | Combo: ${Util.formatCombo(score.combo, beatmap.combo)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}%
Hitcounts: ${score.counts}
PP: ${score.pp} | Grade: ${score.rank}

${link}/b/${beatmap.id.map}`;
}