import { LeaderboardResponse } from "../Types";
import Util from "../Util";
// import { IPPCalculator as ICalc } from "../pp/Calculator";
import BanchoPP from "../pp/bancho";

export default function(leaderboard: LeaderboardResponse): string {
    if(!leaderboard.scores[0])
        return `Ни у кого нет скоров на этой карте!`;
    let map = leaderboard.map;
    return `Топ беседы на карте:
${map.artist} - ${map.title} [${map.version}] by ${map.creator.nickname}\n` + leaderboard.scores/* .slice(0, 10) */.map((lbscore, i) => {
        let pp = lbscore.score.pp;
        return `#${i+1} ${lbscore.user.nickname} | ${lbscore.score.score} | ${Util.formatCombo(lbscore.score.combo, map.combo)} | ${Util.round(lbscore.score.accuracy() * 100, 2)}% | ${lbscore.score.counts.miss} misses | ${Util.round(pp, 2)}pp ${lbscore.score.mods} | ${Util.formatDate(lbscore.score.date, true)}`;
    }).join("\n");
}