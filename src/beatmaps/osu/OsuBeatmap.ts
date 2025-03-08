import { IBeatmapStats, IBeatmap } from "../BeatmapTypes";
import Mods from "../../pp/Mods";
import Util from "../../Util";
import AttributesCalculator from "../../pp/AttributesCalculator";
import { getRosuBeatmap } from "../../pp/RosuUtils";
import * as rosu from "rosu-pp-js";
import { APIBeatmap } from "../../Types";

export class OsuBeatmapStats implements IBeatmapStats {
    readonly ar: number;
    readonly cs: number;
    readonly od: number;
    readonly hp: number;

    readonly bpm: number;
    readonly length: number;
    readonly stars: number;

    constructor(ar: number, hp: number, od: number, cs: number, bpm: number, length: number, stars: number) {
        this.ar = ar;
        this.hp = hp;
        this.od = od;
        this.cs = cs;
        this.bpm = bpm;
        this.length = length;
        this.stars = stars;
    }

    toString(): string {
        const time = Util.formatBeatmapLength(this.length);
        const attrs = `AR:${Util.round(this.ar, 2)} CS:${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
        const bpm = `${this.bpm.toFixed(0)}BPM`;
        const stars = `${this.stars.toFixed(2)}✩`;

        return `${time} | ${attrs} | ${bpm} | ${stars}`;
    }
}

export class OsuBeatmap implements IBeatmap {
    readonly id: number;
    readonly setId: number;
    readonly hash: string;
    readonly mode: number;

    readonly title: string;
    readonly artist: string;

    readonly version: string;
    readonly author: string;
    readonly status: string;

    readonly maxCombo: number;
    readonly hitObjectsCount: number;

    stats: OsuBeatmapStats;

    constructor(apiBeatmap: APIBeatmap) {
        this.id = apiBeatmap.id.map;
        this.setId = apiBeatmap.id.set;
        this.hash = apiBeatmap.id.hash;
        this.mode = apiBeatmap.mode;
        this.title = apiBeatmap.title;
        this.artist = apiBeatmap.artist;
        this.version = apiBeatmap.version;
        this.author = apiBeatmap.creator.nickname;
        this.status = apiBeatmap.status;
        this.maxCombo = apiBeatmap.combo;
        this.hitObjectsCount = apiBeatmap.objects.circles + apiBeatmap.objects.sliders + apiBeatmap.objects.spinners;
        this.stats = new OsuBeatmapStats(
            apiBeatmap.stats.ar,
            apiBeatmap.stats.hp,
            apiBeatmap.stats.od,
            apiBeatmap.stats.cs,
            apiBeatmap.bpm,
            apiBeatmap.length,
            apiBeatmap.diff.stars
        );
    }

    async applyMods(mods: Mods): Promise<void> {
        const rmap = await getRosuBeatmap(this.id);
        switch (this.mode) {
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
        const calc = new AttributesCalculator(rmap.ar, rmap.od, rmap.hp, rmap.cs, mods);
        const diffCalc = new rosu.Difficulty({
            mods: mods.flags,
            clockRate: mods.speed(),
        }).calculate(rmap);

        this.stats = new OsuBeatmapStats(
            calc.calculateMultipliedAR(),
            calc.calculateMultipliedHP(),
            calc.calculateMultipliedOD(),
            calc.calculateMultipliedCS(),
            rmap.bpm * mods.speed(),
            this.stats.length / mods.speed(),
            diffCalc.stars
        );
    }
}
