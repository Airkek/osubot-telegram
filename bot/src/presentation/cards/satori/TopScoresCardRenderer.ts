import { ILocalizer } from "localization/ILocalizer";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IBeatmap } from "games/IBeatmap";
import { IScoreListCardModel } from "presentation/cards/satori/IScoreListCardModel";
import { IScoreListRow } from "presentation/cards/satori/IScoreListRow";
import { CARD_PADDING, HEADER_HEIGHT, OsuScoreListCard, ROW_HEIGHT } from "presentation/cards/satori/OsuScoreListCard";
import { SatoriCardContext } from "presentation/cards/satori/SatoriCardContext";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { resolveScorePp, shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";
import { Util } from "shared/Util";

const CARD_WIDTH = 1000;
const COVER_WIDTH = 220;

export class TopScoresCardRenderer {
    constructor(private readonly context: SatoriCardContext) {}

    async render(
        scores: IGameScore[],
        maps: IBeatmap[],
        user: IGameUser,
        l: ILocalizer,
        startNumber = 1
    ): Promise<Buffer> {
        const rows = await Promise.all(
            scores.map((score, index) => this.buildRow(score, maps[index], l, startNumber + index))
        );

        const model: IScoreListCardModel = {
            header: l.tr("best-scores-header"),
            subheader: l.tr("best-scores-subheader", {
                player_name: user.nickname,
                date: Util.formatDate(new Date()),
            }),
            rows,
        };

        const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + CARD_PADDING;
        return await this.context.toPng(OsuScoreListCard({ model, height }), CARD_WIDTH, height);
    }

    private async buildRow(score: IGameScore, beatmap: IBeatmap, l: ILocalizer, place: number): Promise<IScoreListRow> {
        const [pp, cover] = await Promise.all([
            resolveScorePp(score, new BanchoPerformanceCalculator(beatmap, score.mods)),
            this.context.toDataUri(beatmap.coverUrl, COVER_WIDTH),
        ]);

        return {
            place: `#${place}`,
            primary: beatmap.title,
            secondary: beatmap.version,
            mods: score.mods?.toString() ?? "",
            grade: score.rank,
            pp: pp.actual !== undefined ? pp.actual.toFixed(0) : undefined,
            fcPp: shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc) ? pp.fc.toFixed(0) : undefined,
            accuracy: `${(score.accuracy() * 100).toFixed(2)}%`,
            combo: Util.formatCombo(score.combo, beatmap.maxCombo),
            cover,
        };
    }
}
