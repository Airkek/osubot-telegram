import { HitCounts } from "games/scores/HitCounts";
import { IGameScore } from "games/scores/IGameScore";
import { CalculatedScoreInput } from "games/osu/performance/CalculatedScoreInput";
import { IPerformanceCalculator } from "games/osu/performance/IPerformanceCalculator";
import { IPerformanceResult } from "games/osu/performance/IPerformanceResult";
import { Mods } from "games/osu/performance/Mods";
import { OsrReplay } from "games/osu/replays/OsrReplay";
import { IBeatmap } from "games/IBeatmap";
import { calculatePerformance, hitStatistics } from "games/osu/performance/OfficialCalculator";

export class BanchoPerformanceCalculator implements IPerformanceCalculator {
    map: IBeatmap;
    mods: Mods;
    speedMultiplier: number = 1;
    constructor(map: IBeatmap, mods: Mods) {
        this.map = map;
        this.mods = mods;
        this.speedMultiplier = mods.speed();
    }

    async calculate(score: IGameScore | CalculatedScoreInput | OsrReplay): Promise<IPerformanceResult> {
        const placeholder = { pp: 0, fc: 0, ss: 0 };
        if (!(score.counts instanceof HitCounts)) {
            return placeholder;
        }
        const hitData = score.counts.hitData;
        const legacy = !this.mods.isLazer();
        const result = await calculatePerformance(this.map, score.mode, this.mods, {
            accuracy: score.accuracy(),
            combo: score.combo,
            total_score: score.score ?? 0,
            legacy,
            standardised: score.standardised ?? !legacy,
            simulate: score.fake === true,
            statistics: score.fake ? { miss: hitData.miss ?? 0 } : hitStatistics(hitData, score.mode),
        });
        return { pp: result.pp, fc: result.fc_pp, ss: result.ss_pp };
    }
}
