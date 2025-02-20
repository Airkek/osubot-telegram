import { APIScore, APIBeatmap, APIUser, Mode } from '../Types';
import Util from '../Util';
import { IPPCalculator as ICalc } from '../pp/Calculator';

export default function(score: APIScore, beatmap: APIBeatmap, user: APIUser, place: number, calc: ICalc, link: string) {
    return `Топ #${place} скор игрока ${user.nickname} (${Mode[score.mode]}):
${Util.formatBeatmap(beatmap)} ${score.mods}

${Util.formatDate(score.date)}
Score: ${score.score.toLocaleString()} | Combo: ${Util.formatCombo(score.combo, beatmap.combo)}
Accuracy: ${Util.round(score.accuracy() * 100, 2)}%
Hitcounts: ${score.counts}
PP: ${score.pp} | Grade: ${score.rank}

${beatmap.mapUrl ?? `${link}/b/${beatmap.id.map}`}`;
}