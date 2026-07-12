import { Util } from "shared/Util";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { BeatmapPerformanceSummary } from "presentation/templates/BeatmapPerformanceSummary";

export function formatBeatmapInfo(l: ILocalizer, map: IBeatmap, performance: BeatmapPerformanceSummary): string {
    const mapText = Util.formatBeatmap(map);
    const formatPPResults = ({ pp98, pp99, pp100 }: Extract<BeatmapPerformanceSummary, { kind: "accuracy" }>): string =>
        `PP:
- 98% = ${Util.round(pp98, 2)}
- 99% = ${Util.round(pp99, 2)}
- 100% = ${Util.round(pp100, 2)}`;
    const content =
        performance.kind === "accuracy"
            ? formatPPResults(performance)
            : `PP (1M score): ${Util.round(performance.pp, 2)}`;
    return `${mapText}\n${content}`;
}
