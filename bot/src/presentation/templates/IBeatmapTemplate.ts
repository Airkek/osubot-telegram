import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { BeatmapPerformanceSummary } from "presentation/templates/BeatmapPerformanceSummary";

export interface IBeatmapTemplate {
    (localizer: ILocalizer, beatmap: IBeatmap, performance: BeatmapPerformanceSummary): string;
}
