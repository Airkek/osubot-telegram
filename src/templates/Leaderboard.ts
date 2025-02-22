import { LeaderboardResponse } from "../Types";
import Util from "../Util";

export default function (leaderboard: LeaderboardResponse): string {
    if (!leaderboard.scores[0]) {
        return "Ни у кого нет скоров на этой карте!";
    }

    const map = leaderboard.map;
    const result = `Топ беседы на карте:
${Util.formatBeatmap(map)}\n`;

    return (
        result +
        leaderboard.scores
            // .slice(0, 10)
            .map((lbscore, i) => {
                return (
                    `#${i + 1} ${lbscore.user.nickname} | ` +
                    `${lbscore.score.score?.toLocaleString()} | ` +
                    `${Util.formatCombo(lbscore.score.combo, map.combo)} | ` +
                    `${Util.round(lbscore.score.accuracy() * 100, 2)}% | ` +
                    `${lbscore.score.counts.miss} misses | ` +
                    `${Util.round(lbscore.score.pp, 2)}pp ` +
                    `${lbscore.score.mods} | ` +
                    `${Util.formatDate(lbscore.score.date, true)}`
                );
            })
            .join("\n")
    );
}
