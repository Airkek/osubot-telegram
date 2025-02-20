import { IBeatmapStats } from "../Types";
import Util from "../Util";
import Mods from "./Mods";

interface ICalcStats {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    modify(mods: Mods): void;
    toString?(): string;
    hitWindow?(): number;
}

class OsuStats implements ICalcStats {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    constructor(base: IBeatmapStats) {
        this.ar = base.ar;
        this.cs = base.cs;
        this.od = base.od;
        this.hp = base.hp;
    }

    modify(mods: Mods) {
        let speedMul = 1;
        if (mods.has("DoubleTime")) {
            speedMul *= 1.5;
        }
        if (mods.has("HalfTime")) {
            speedMul *= 0.75;
        }

        let multiplier = 1;
        if (mods.has("Easy")) {
            multiplier *= 0.5;
        }
        if (mods.has("HardRock")) {
            multiplier *= 1.4;
        }

        // Modify AR
        let baseAR = this.ar;
        baseAR *= multiplier;
        let arms = baseAR < 5 ? 1800 - 120 * baseAR : 1200 - 150 * (baseAR - 5);
        arms = Math.min(1800, Math.max(450, arms));
        arms /= speedMul;
        this.ar = arms > 1200 ? (1800 - arms) / 120 : 5 + (1200 - arms) / 150;

        // Modify OD
        let baseOD = this.od;
        baseOD *= multiplier;
        let odms = 80 - Math.ceil(6 * baseOD);
        odms = Math.min(80, Math.max(20, odms));
        odms /= speedMul;
        this.od = (80 - odms) / 6;

        // Modify CS
        if (mods.has("HardRock")) {
            this.cs *= 1.3;
        }
        if (mods.has("Easy")) {
            this.cs *= 0.5;
        }
        this.cs = Math.min(this.cs, 10);

        // Modify HP
        this.hp = Math.min(this.hp * multiplier, 10);
    }

    toString(): string {
        return `AR:${Util.round(this.ar, 2)} CS:${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
    }

    hitWindow(): number {
        return 80 - Math.ceil(6 * this.od);
    }
}

class TaikoStats implements ICalcStats {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    constructor(base: IBeatmapStats) {
        this.ar = base.ar;
        this.cs = base.cs;
        this.od = base.od;
        this.hp = base.hp;
    }

    modify(mods: Mods) {
        if (mods.has("Easy")) {
            this.od *= 0.5;
        }
        if (mods.has("HardRock")) {
            this.od *= 1.4;
        }
        this.od = Math.max(0, Math.min(10, this.od));
    }

    toString(): string {
        return `AR:${Util.round(this.ar, 2)} CS:${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
    }

    hitWindow(): number {
        return Math.floor(50 + ((20 - 50) * this.od) / 10) - 0.5;
    }
}

class CatchStats implements ICalcStats {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    constructor(base: IBeatmapStats) {
        this.ar = base.ar;
        this.cs = base.cs;
        this.od = base.od;
        this.hp = base.hp;
    }

    modify(mods: Mods) {
        if (mods.has("DoubleTime")) {
            let ms = 0;
            if (this.ar > 5) {
                ms = 200 + (11 - this.ar) * 100;
            } else {
                ms = 800 + (5 - this.ar) * 80;
            }

            if (ms < 300) {
                this.ar = 11;
            } else if (ms < 1200) {
                this.ar = Math.round((11 - (ms - 300) / 150) * 100) / 100;
            } else {
                this.ar = Math.round((5 - (ms - 1200) / 120) * 100) / 100;
            }
        }
    }

    toString(): string {
        return `AR:${Util.round(this.ar, 2)} CS:${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
    }
}

class ManiaStats implements ICalcStats {
    ar: number;
    cs: number;
    od: number;
    hp: number;
    constructor(base: IBeatmapStats) {
        this.ar = base.ar;
        this.cs = base.cs;
        this.od = base.od;
        this.hp = base.hp;
    }

    modify(mods: Mods) {
        if (mods.has("Easy")) {
            this.od *= 0.5;
            this.hp *= 0.5;
        }
    }

    toString(): string {
        return `Keys:${this.cs} OD:${this.od} HP:${this.hp}`;
    }

    hitWindow(): number {
        return 34 + 3 * Math.min(10, Math.max(0, 10 - this.od));
    }
}

export { ICalcStats, OsuStats, TaikoStats, CatchStats, ManiaStats };
