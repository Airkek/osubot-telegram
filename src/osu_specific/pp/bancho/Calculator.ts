import { IPPCalculator as ICalc } from "../Calculator";
import Mods from "../Mods";
import { APIScore, CalcArgs, HitCounts } from "../../../Types";
import { OsrReplay } from "../../OsrReplay";
import { IBeatmap } from "../../../beatmaps/BeatmapTypes";
import { calculatePerformance, hitStatistics } from "../OfficialCalculator";

interface IPP {
    pp: number;
    fc: number;
    ss: number;
}

class BanchoPP implements ICalc {
    map: IBeatmap;
    mods: Mods;
    speedMultiplier: number = 1;
    constructor(map: IBeatmap, mods: Mods) {
        this.map = map;
        this.mods = mods;
        this.speedMultiplier = mods.speed();
    }

    async calculate(score: APIScore | CalcArgs | OsrReplay): Promise<IPP> {
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

export default BanchoPP;
