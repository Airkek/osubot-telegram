import { Mods } from "games/osu/performance/Mods";

export interface IPerformanceRequest {
    score?: number;
    acc?: number;
    combo?: number;
    miss?: number;
    hits?: number;
    counts?: {
        50: number;
    };
    mods: Mods;
}
