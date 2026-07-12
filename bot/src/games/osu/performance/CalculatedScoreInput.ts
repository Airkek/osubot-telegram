import { HitCounts } from "games/scores/HitCounts";
import { Mods } from "games/osu/performance/Mods";
import { IPerformanceRequest } from "games/osu/performance/IPerformanceRequest";

export class CalculatedScoreInput {
    score?: number;
    acc?: number;
    combo?: number;
    counts?: HitCounts;
    mods: Mods;
    mode: number;
    fake = true;
    standardised = true;

    constructor(args: IPerformanceRequest, mode: number) {
        this.mods = args.mods;
        this.mode = mode;
        this.acc = args.acc;
        this.combo = args.combo;

        switch (mode) {
            case 0:
            case 1:
            case 2:
                this.counts = new HitCounts(
                    {
                        300: (args.hits ?? 0) - (args.miss ?? 0),
                        100: 0,
                        50: args.counts?.[50] ?? 0,
                        katu: 0,
                        geki: 0,
                        miss: args.miss ?? 0,
                    },
                    mode
                );
                break;
            case 3:
                this.counts = new HitCounts(
                    {
                        300: args.hits ?? 0,
                        100: 0,
                        50: 0,
                        miss: 0,
                        katu: 0,
                        geki: 0,
                    },
                    mode
                );
                break;
        }
    }

    accuracy(): number | undefined {
        return this.acc;
    }
}
