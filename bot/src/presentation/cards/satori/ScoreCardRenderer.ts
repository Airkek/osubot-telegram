import { ILocalizer } from "localization/ILocalizer";
import { IGameScore } from "games/scores/IGameScore";
import { IBeatmap } from "games/IBeatmap";
import { IScoreCardModel } from "presentation/cards/satori/IScoreCardModel";
import { OsuScoreCard } from "presentation/cards/satori/OsuScoreCard";
import { SatoriCardContext } from "presentation/cards/satori/SatoriCardContext";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { resolveScorePp, shouldDisplayPpEstimate } from "games/osu/performance/PPDisplay";
import { Util } from "shared/Util";

const CARD_WIDTH = 1000;
const CARD_HEIGHT = 520;
const COVER_WIDTH = CARD_WIDTH * 2;

// OsuBeatmapStats не экспортируется, а нужны только числа для подписей.
interface IBeatmapNumbers {
    stars?: number;
    bpm?: number;
    length?: number;
    ar?: number;
    cs?: number;
    od?: number;
    hp?: number;
}

export class ScoreCardRenderer {
    constructor(private readonly context: SatoriCardContext) {}

    async render(score: IGameScore, beatmap: IBeatmap, l: ILocalizer): Promise<Buffer> {
        const cover = await this.context.toDataUri(beatmap.coverUrl, COVER_WIDTH);
        const model = await this.buildModel(score, beatmap, l, cover);
        return await this.context.toPng(OsuScoreCard({ model }), CARD_WIDTH, CARD_HEIGHT);
    }

    private async buildModel(
        score: IGameScore,
        beatmap: IBeatmap,
        l: ILocalizer,
        cover?: string
    ): Promise<IScoreCardModel> {
        const pp = await resolveScorePp(score, new BanchoPerformanceCalculator(beatmap, score.mods));
        const ppEntries: IScoreCardModel["pp"] = [];
        if (pp.actual !== undefined) {
            ppEntries.push({ label: "PP", value: pp.actual.toFixed(0) });
        }
        if (shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.fc)) {
            ppEntries.push({ label: "FC", value: pp.fc.toFixed(0) });
        }
        if (shouldDisplayPpEstimate(pp.actual, pp.calculated, pp.ss)) {
            ppEntries.push({ label: "SS", value: pp.ss.toFixed(0) });
        }

        const stats = beatmap.stats as unknown as IBeatmapNumbers;
        const facts: IScoreCardModel["facts"] = [];
        if (stats?.stars !== undefined) {
            facts.push({ label: "★", value: stats.stars.toFixed(2) });
        }
        if (stats?.bpm !== undefined) {
            facts.push({ label: "BPM", value: String(Math.round(stats.bpm)) });
        }
        if (stats?.length !== undefined) {
            facts.push({ label: "⏱", value: Util.minutesToPlaytimeString(stats.length / 60) });
        }
        for (const [label, value] of [
            ["AR", stats?.ar],
            ["CS", stats?.cs],
            ["OD", stats?.od],
            ["HP", stats?.hp],
        ] as const) {
            if (value !== undefined) {
                facts.push({ label, value: Util.round(value, 1).toString() });
            }
        }

        const failed = score.rank === "F" && beatmap.hitObjectsCount > 0;

        return {
            title: beatmap.title,
            artist: beatmap.artist,
            version: beatmap.version,
            mapper: beatmap.author,
            status: beatmap.status,
            mods: score.mods?.toString() ?? "",

            grade: score.rank,
            score: score.score?.toLocaleString() ?? "0",
            accuracy: `${(score.accuracy() * 100).toFixed(2)}%`,
            combo: Util.formatCombo(score.combo, beatmap.maxCombo),

            pp: ppEntries,
            counts: score.counts.getCountNames(l).map((entry) => ({
                label: entry.name,
                value: entry.value?.toLocaleString() ?? "0",
            })),
            facts,

            date: score.date ? Util.formatDate(score.date) : undefined,
            globalRank:
                score.rank_global && score.rank_global <= 1000 ? `#${score.rank_global.toLocaleString()}` : undefined,
            personalTop: score.top100_number ? l.tr("personal_top_score", { number: score.top100_number }) : undefined,
            failedAt: failed
                ? `${l.tr("score-failed-at")} ${((score.counts.totalHits() / beatmap.hitObjectsCount) * 100).toFixed(1)}%`
                : undefined,

            labels: {
                score: l.tr("score-score"),
                accuracy: l.tr("score-accuracy"),
                combo: l.tr("score-combo"),
            },

            cover,
        };
    }
}
