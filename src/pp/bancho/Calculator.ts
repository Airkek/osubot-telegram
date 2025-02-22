import { IPPCalculator as ICalc } from "../Calculator";
import * as rosu from "rosu-pp-js";
import * as fs from "fs";
import Mods from "../Mods";
import { APIScore, APIBeatmap, CalcArgs } from "../../Types";
import { ICalcStats } from "../Stats";
import { Replay } from "../../Replay";

interface IPP {
    pp: number;
    fc: number;
    ss: number;
}

export function getRosuBeatmap(id: number): rosu.Beatmap {
    const folderPath = "beatmap_cache";
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const filePath = `beatmap_cache/${id}.osu`;
    if (fs.existsSync(filePath)) {
        return new rosu.Beatmap(fs.readFileSync(filePath, "utf-8"));
    }

    return null;
}

class BanchoPP implements ICalc {
    map: APIBeatmap;
    mods: Mods;
    speedMultiplier: number = 1;
    stats: ICalcStats;
    constructor(map: APIBeatmap, mods: Mods) {
        this.map = map;
        this.mods = mods;
        this.stats = map.stats;
        this.speedMultiplier = mods.speed();
    }

    calculate(score: APIScore | CalcArgs | Replay): IPP {
        if (this.mods.has("Relax") || this.mods.has("Relax2") || this.mods.has("Autoplay")) {
            return { pp: 0, fc: 0, ss: 0 };
        }

        const map = getRosuBeatmap(this.map.id.map);
        if (map == null) {
            return { pp: 0, fc: 0, ss: 0 };
        }

        const res = this.PP(score, map);
        map.free();
        return res;
    }

    PP(score: APIScore | CalcArgs | Replay, rmap: rosu.Beatmap) {
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
