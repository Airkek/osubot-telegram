import { IBeatmap } from "games/IBeatmap";
import { CalculatedScoreInput } from "games/osu/performance/CalculatedScoreInput";
import { IPerformanceResult } from "games/osu/performance/IPerformanceResult";
import { Mods } from "games/osu/performance/Mods";
import { OsrReplay } from "games/osu/replays/OsrReplay";
import { IGameScore } from "games/scores/IGameScore";

export interface IPerformanceCalculator {
    speedMultiplier: number;
    map: IBeatmap;
    mods: Mods;
    calculate(score: IGameScore | OsrReplay | CalculatedScoreInput): Promise<IPerformanceResult>;
}
