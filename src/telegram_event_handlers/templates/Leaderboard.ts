import { LeaderboardResponse } from "../../Types";
import Util from "../../Util";
import { ILocalisator } from "../../ILocalisator";

export default function (l: ILocalisator, leaderboard: LeaderboardResponse): string {
    if (!leaderboard.scores[0]) {
        return l.tr("nobody-played-this-map");
    }

    const map = leaderboard.map;
    const result = l.tr("map-leaderboard-header") + "\n" + Util.formatBeatmap(map) + "\n\n";

    return (
        result +
        leaderboard.scores
            // .slice(0, 10)
            .map((lbscore, i) => {
                const missLike = lbscore.score.counts.getMissLikeValue(l);
                return (
                    `#${i + 1} ${lbscore.user.nickname} | ` +
                    `${lbscore.score.score?.toLocaleString()} | ` +
                    `${Util.formatCombo(lbscore.score.combo, map.maxCombo)} | ` +
                    `${(lbscore.score.accuracy() * 100).toFixed(2)}% | ` +
                    `${missLike.name}: ${missLike.value} | ` +
                    `${Util.round(lbscore.score.pp, 2)}pp ` +
                    `${lbscore.score.mods} | ` +
                    `${Util.formatDate(lbscore.score.date, true)}`
                );
            })
            .join("\n")
    );
}
