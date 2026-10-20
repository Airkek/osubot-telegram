import { ILocalizer } from "localization/ILocalizer";
import { IBeatmap } from "games/IBeatmap";
import { IBeatmapCardModel } from "presentation/cards/satori/IBeatmapCardModel";
import { IPerformanceRequest } from "games/osu/performance/IPerformanceRequest";
import { BEATMAP_CARD_HEIGHT, BEATMAP_CARD_WIDTH, OsuBeatmapCard } from "presentation/cards/satori/OsuBeatmapCard";
import { SatoriCardContext } from "presentation/cards/satori/SatoriCardContext";
import { BanchoPerformanceCalculator } from "games/osu/performance/bancho/BanchoPerformanceCalculator";
import { Util } from "shared/Util";

const COVER_WIDTH = BEATMAP_CARD_WIDTH * 2;

const INFO_ACCURACIES = [0.95, 0.98, 0.99, 1];

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

export class BeatmapCardRenderer {
    constructor(private readonly context: SatoriCardContext) {}

    /** Инфо о карте: PP на 95/98/99/100% текущими модами. */
    async renderInfo(beatmap: IBeatmap): Promise<Buffer> {
        const calculator = new BanchoPerformanceCalculator(beatmap, beatmap.currentMods);
        const pp: IBeatmapCardModel["pp"] = [];

        for (const accuracy of INFO_ACCURACIES) {
            const args = Util.createPPArgs(
                {
                    acc: accuracy,
                    combo: beatmap.maxCombo,
                    hits: beatmap.hitObjectsCount,
                    miss: 0,
                    mods: beatmap.currentMods,
                    counts: { 50: 0 },
                },
                beatmap.mode
            );
            const result = await calculator.calculate(args);
            pp.push({ label: `${Math.round(accuracy * 100)}%`, value: result.pp.toFixed(0) });
        }

        return await this.draw(beatmap, pp);
    }

    /** PP-карточка: один расчёт по тому, что попросил пользователь. */
    async renderPp(beatmap: IBeatmap, l: ILocalizer, args?: IPerformanceRequest): Promise<Buffer> {
        const calculator = new BanchoPerformanceCalculator(beatmap, beatmap.currentMods);
        const request = Util.createPPArgs(args, beatmap.mode);
        const result = await calculator.calculate(request);

        const parts: string[] = [];
        if (args?.acc !== undefined) {
            parts.push(`${l.tr("score-accuracy")} ${(args.acc * 100).toFixed(2)}%`);
        }
        if (args?.combo !== undefined) {
            parts.push(`${l.tr("score-combo")} ${args.combo}x`);
        }
        if (args?.miss) {
            parts.push(`${args.miss} ${l.tr("score-misses")}`);
        }

        return await this.draw(beatmap, [{ label: "PP", value: result.pp.toFixed(0) }], parts.join(" · "));
    }

    private async draw(beatmap: IBeatmap, pp: IBeatmapCardModel["pp"], note?: string): Promise<Buffer> {
        const cover = await this.context.toDataUri(beatmap.coverUrl, COVER_WIDTH);
        const stats = beatmap.stats as unknown as IBeatmapNumbers;

        const facts: IBeatmapCardModel["facts"] = [];
        if (stats?.stars !== undefined) {
            facts.push({ label: "★", value: stats.stars.toFixed(2) });
        }
        if (stats?.bpm !== undefined) {
            facts.push({ label: "BPM", value: String(Math.round(stats.bpm)) });
        }
        if (stats?.length !== undefined) {
            facts.push({ label: "LEN", value: Util.formatBeatmapLength(stats.length) });
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

        const model: IBeatmapCardModel = {
            title: beatmap.title,
            artist: beatmap.artist,
            mapper: beatmap.author,
            version: beatmap.version,
            status: beatmap.status,
            mods: beatmap.currentMods?.toString() ?? "",
            facts,
            pp,
            note,
            cover,
        };

        return await this.context.toPng(OsuBeatmapCard({ model }), BEATMAP_CARD_WIDTH, BEATMAP_CARD_HEIGHT);
    }
}
