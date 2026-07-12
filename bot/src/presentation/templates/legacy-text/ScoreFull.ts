import { IGameScore } from "games/scores/IGameScore";
import { Util } from "shared/Util";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { IScorePpDisplay } from "games/osu/performance/IScorePpDisplay";
import { shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";

export function formatScoreFull(
    l: ILocalizer,
    score: IGameScore,
    beatmap: IBeatmap,
    pp: IScorePpDisplay,
    serverLink: string
): string {
    let ppString: string | undefined;
    if (pp.actual !== undefined) {
        ppString = `PP: ${pp.actual.toFixed(2)}`;
        if (shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc)) {
            ppString += ` → FC: ${pp.fc!.toFixed(2)}`;
        }

        if (shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.ss)) {
            ppString += ` → SS: ${pp.ss!.toFixed(2)}`;
        }
    }

    const beatmapUrl = beatmap.url ?? `${serverLink}/b/${beatmap.id}`;

    const total = [
        `${Util.formatBeatmap(beatmap)} ${score.mods}`,
        "",
        `${l.tr("score-score")}: ${score.score?.toLocaleString()}`,
        `${l.tr("score-combo")}: ${Util.formatCombo(score.combo, beatmap.maxCombo)}`,
        `${l.tr("score-accuracy")}: ${(score.accuracy() * 100).toFixed(2)}%`,
        ...(ppString ? [ppString] : []),
        `${l.tr("score-hitcounts")}: ${score.counts.toString()}`,
    ];

    if (score.rank) {
        const progress = score.counts.totalHits() / beatmap.hitObjectsCount;
        const gradeProgress = score.rank === "F" ? ` (${Util.round(progress * 100, 2)}%)` : "";
        total.push(`${l.tr("score-grade")}: ${score.rank}${gradeProgress}`);
    }

    if (score.date) {
        total.push(`${l.tr("score-date")}: ${Util.formatDate(score.date)}`);
    }

    if (score.rank_global && score.rank_global <= 1000) {
        let rankStr = l.tr("score_rank_on_the_map", {
            rank: score.rank_global,
        });
        if (score.rank_global <= 50) {
            rankStr = `🏆 ${rankStr}`;
        }

        total.push(rankStr);
    }

    if (score.top100_number) {
        total.push(
            "🏆 " +
                l.tr("personal_top_score", {
                    number: score.top100_number,
                })
        );
    }

    total.push(`\n${l.tr("score-beatmap-link")}: ${beatmapUrl}`);
    return total.join("\n");
}
