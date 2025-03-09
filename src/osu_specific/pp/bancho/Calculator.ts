import { IPPCalculator as ICalc } from "../Calculator";
import * as rosu from "rosu-pp-js";
import Mods from "../Mods";
import { APIScore, CalcArgs } from "../../../Types";
import { OsuReplay } from "../../OsuReplay";
import { getRosuBeatmapSync } from "../RosuUtils";
import { IBeatmap } from "../../../beatmaps/BeatmapTypes";

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

    calculate(score: APIScore | CalcArgs | OsuReplay): IPP {
        if (this.mods.has("Relax") || this.mods.has("Relax2") || this.mods.has("Autoplay")) {
            return { pp: 0, fc: 0, ss: 0 };
        }

        const map = getRosuBeatmapSync(this.map.id);
        if (map == null) {
            return { pp: 0, fc: 0, ss: 0 };
        }

        const res = this.PP(score, map);
        map.free();
        return res;
    }

    PP(score: APIScore | CalcArgs | OsuReplay, rmap: rosu.Beatmap) {
        switch (score.mode) {
            case 1:
                rmap.convert(rosu.GameMode.Taiko);
                break;
            case 2:
                rmap.convert(rosu.GameMode.Catch);
                break;
            case 3:
                rmap.convert(rosu.GameMode.Mania);
                break;
            default:
                rmap.convert(rosu.GameMode.Osu);
                break;
        }

        const currAttrs = new rosu.Performance({
            mods: this.mods.flags,
            clockRate: this.speedMultiplier,
            n300: score.fake ? undefined : score.counts[300],
            n100: score.fake ? undefined : score.counts[100],
            n50: score.fake ? undefined : score.counts[50],
            nGeki: score.fake ? undefined : score.counts.geki,
            nKatu: score.fake ? undefined : score.counts.katu,
            misses: score.counts.miss,
            largeTickHits: score.counts.slider_large,
            sliderEndHits: score.counts.slider_tail,
            lazer: this.mods.isLazer(),
            accuracy: score.fake ? score.accuracy() * 100 : undefined,
            combo: score.combo,
        }).calculate(rmap);

        const fcAttrs = new rosu.Performance({
            mods: this.mods.flags,
            clockRate: this.speedMultiplier,
            n300: score.counts[300] + score.counts.miss,
            n100: score.counts[100],
            n50: score.counts[50],
            nGeki: score.counts.geki,
            nKatu: score.counts.katu,
            lazer: this.mods.isLazer(),
        }).calculate(rmap);

        const maxAttrs =
            score.accuracy() === 1 &&
            score.counts[100] === 0 &&
            score.counts[50] === 0 &&
            score.counts.miss === 0 &&
            (score.mode != 3 || (score.counts.katu === 0 && score.counts[300] === 0))
                ? currAttrs
                : new rosu.Performance({
                      mods: this.mods.flags,
                      clockRate: this.speedMultiplier,
                      lazer: this.mods.isLazer(),
                  }).calculate(rmap);

        return { pp: currAttrs.pp, fc: fcAttrs.pp, ss: maxAttrs.pp };
    }
}

export default BanchoPP;
