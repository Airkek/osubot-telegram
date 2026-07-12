import { IBeatmap } from "games/IBeatmap";
import { IPerformanceResult } from "games/osu/performance/IPerformanceResult";
import { CalculatedScoreInput } from "games/osu/performance/CalculatedScoreInput";
import { ILocalizer } from "localization/ILocalizer";

export interface IPerformanceTemplate {
    (localizer: ILocalizer, beatmap: IBeatmap, input: CalculatedScoreInput, performance: IPerformanceResult): string;
}
