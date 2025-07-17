import { IPPCalculator as ICalc } from "../Calculator";
import * as rosu from "@kotrikd/rosu-pp";
import Mods, { ModsBitwise } from "../Mods";
import { APIScore, CalcArgs, HitCounts } from "../../../Types";
import { OsrReplay } from "../../OsrReplay";
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

    calculate(score: APIScore | CalcArgs | OsrReplay): IPP {
        const map = getRosuBeatmapSync(this.map);
        if (map == null) {
            return { pp: 0, fc: 0, ss: 0 };
        }

        const res = this.PP(score, map);
        map.free();
        return res;
    }

    PP(score: APIScore | CalcArgs | OsrReplay, rmap: rosu.Beatmap) {
        if (!(score.counts instanceof HitCounts)) {
            return undefined;
        }
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

        let flags = this.mods.flags;
        if (flags & ModsBitwise.Relax) {
            flags ^= ModsBitwise.Relax;
        }
        if (flags & ModsBitwise.Relax2) {
            flags ^= ModsBitwise.Relax2;
        }
        if (flags & ModsBitwise.Autoplay) {
            flags ^= ModsBitwise.Autoplay;
        }

        const hitData = score.counts.hitData;
        const currAttrs = new rosu.Performance({
            mods: flags,
            clockRate: this.speedMultiplier,
            n300: score.fake ? undefined : hitData[300],
            n100: score.fake ? undefined : hitData[100],
            n50: score.fake ? undefined : hitData[50],
            nGeki: score.fake ? undefined : hitData.geki,
            nKatu: score.fake ? undefined : hitData.katu,
            misses: hitData.miss,
            largeTickHits: hitData.slider_large,
            sliderEndHits: hitData.slider_tail,
            lazer: this.mods.isLazer(),
            accuracy: score.fake ? score.accuracy() * 100 : undefined,
            combo: score.combo,
        }).calculate(rmap);

        const fcAttrs = new rosu.Performance({
            mods: flags,
            clockRate: this.speedMultiplier,
            n300: hitData[300] + hitData.miss,
            n100: hitData[100],
            n50: hitData[50],
            nGeki: hitData.geki,
            nKatu: hitData.katu,
            lazer: this.mods.isLazer(),
        }).calculate(rmap);

        const maxAttrs =
            score.accuracy() === 1 &&
            hitData[100] === 0 &&
            hitData[50] === 0 &&
            hitData.miss === 0 &&
            (score.mode != 3 || (hitData.katu === 0 && hitData[300] === 0))
                ? currAttrs
                : new rosu.Performance({
                      mods: flags,
                      clockRate: this.speedMultiplier,
                      lazer: this.mods.isLazer(),
                  }).calculate(rmap);

        return { pp: currAttrs.pp, fc: fcAttrs.pp, ss: maxAttrs.pp };
    }
}

export default BanchoPP;
