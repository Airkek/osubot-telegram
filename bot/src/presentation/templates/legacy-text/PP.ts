import { Util } from "shared/Util";
import { IBeatmap } from "games/IBeatmap";
import { ILocalizer } from "localization/ILocalizer";
import { CalculatedScoreInput } from "games/osu/performance/CalculatedScoreInput";
import { IPerformanceResult } from "games/osu/performance/IPerformanceResult";

export function formatPerformance(
    l: ILocalizer,
    map: IBeatmap,
    input: CalculatedScoreInput,
    performance: IPerformanceResult
): string {
    return `${Util.formatBeatmap(map)} ${map.currentMods.toString()}
${l.tr("score-accuracy")}: ${(input.acc * 100).toFixed(2)}%${
        map.mode !== 3
            ? `
${l.tr("score-combo")}: ${Util.formatCombo(input.combo, map.maxCombo)} | ${l.tr("score-misses-calc", {
                  count: input.counts.hitData.miss,
              })}`
            : ""
    }
- PP: ${Util.round(performance.pp, 2)}
`.trim();
}
