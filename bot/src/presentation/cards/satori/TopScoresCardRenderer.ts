import { ILocalizer } from "localization/ILocalizer";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IBeatmap } from "games/IBeatmap";
import { ITopScoresCardModel } from "presentation/cards/satori/ITopScoresCardModel";
import { ITopScoresCardRow } from "presentation/cards/satori/ITopScoresCardRow";
import { CARD_PADDING, HEADER_HEIGHT, OsuTopScoresCard, ROW_HEIGHT } from "presentation/cards/satori/OsuTopScoresCard";
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

        const model: ITopScoresCardModel = {
            header: l.tr("best-scores-header"),
            subheader: l.tr("best-scores-subheader", {
                player_name: user.nickname,
                date: Util.formatDate(new Date()),
            }),
            rows,
        };

        const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT + CARD_PADDING;
        return await this.context.toPng(OsuTopScoresCard({ model, height }), CARD_WIDTH, height);
    }

    private async buildRow(
        score: IGameScore,
        beatmap: IBeatmap,
        l: ILocalizer,
        place: number
    ): Promise<ITopScoresCardRow> {
        const [pp, cover] = await Promise.all([
            resolveScorePp(score, new BanchoPerformanceCalculator(beatmap, score.mods)),
            this.context.toDataUri(beatmap.coverUrl, COVER_WIDTH),
        ]);

        return {
            place: `#${place}`,
            title: beatmap.title,
            version: beatmap.version,
            mods: score.mods?.toString() ?? "",
            grade: score.rank,
            pp: pp.actual !== undefined ? pp.actual.toFixed(0) : undefined,
            fcPp: shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc) ? pp.fc.toFixed(0) : undefined,
            accuracy: `${(score.accuracy() * 100).toFixed(2)}%`,
            combo: Util.formatCombo(score.combo, beatmap.maxCombo),
            date: score.date ? Util.formatDate(score.date) : undefined,
            cover,
        };
    }
}
