import { ILocalizer } from "localization/ILocalizer";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { ILeaderboardEntry } from "games/leaderboards/ILeaderboardEntry";
import { IBeatmap } from "games/IBeatmap";
import { IScoreListCardModel } from "presentation/cards/satori/IScoreListCardModel";
import { IScoreListRow } from "presentation/cards/satori/IScoreListRow";
import { CARD_PADDING, HEADER_HEIGHT, OsuScoreListCard, ROW_HEIGHT } from "presentation/cards/satori/OsuScoreListCard";
import { SatoriCardContext } from "presentation/cards/satori/SatoriCardContext";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { resolveScorePp, shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";
import { Util } from "shared/Util";

const CARD_WIDTH = 1000;

export class LeaderboardCardRenderer {
    constructor(private readonly context: SatoriCardContext) {}

    async render(leaderboard: ILeaderboardResult, l: ILocalizer, startNumber: number): Promise<Buffer> {
        const map = leaderboard.map;
        const rows = await Promise.all(
            leaderboard.scores.map((entry, index) => this.buildRow(entry, map, startNumber + index))
        );

        const model: IScoreListCardModel = {
            header: l.tr("leaderboard-card-header"),
            subheader: l.tr("leaderboard-card-subheader", {
                artist: map.artist,
                title: map.title,
                difficulty: map.version,
            }),
            rows,
        };

        const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + CARD_PADDING;
        return await this.context.toPng(OsuScoreListCard({ model, height }), CARD_WIDTH, height);
    }

    private async buildRow(entry: ILeaderboardEntry, map: IBeatmap, place: number): Promise<IScoreListRow> {
        const score = entry.score;
        const pp = await resolveScorePp(score, new BanchoPerformanceCalculator(map, score.mods));

        return {
            place: `#${place}`,
            primary: entry.user.nickname,
            // Карта у всех строк одна, поэтому во второй строке полезнее страна.
            secondary: entry.country ?? "",
            mods: score.mods?.toString() ?? "",
            grade: score.rank,
            pp: pp.actual !== undefined ? pp.actual.toFixed(0) : undefined,
            fcPp: shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc) ? pp.fc.toFixed(0) : undefined,
            accuracy: `${(score.accuracy() * 100).toFixed(2)}%`,
            combo: Util.formatCombo(score.combo, map.maxCombo),
        };
    }
}
