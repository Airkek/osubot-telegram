import { IBeatmapStats, IBeatmap } from "../BeatmapTypes";
import Mods from "../../pp/Mods";
import Util from "../../Util";
import AttributesCalculator from "../../pp/AttributesCalculator";
import { getRosuBeatmap } from "../../pp/RosuUtils";
import * as rosu from "rosu-pp-js";
import { APIBeatmap } from "../../Types";
import { IOsuBeatmapMetadata } from "../../Database";

export class OsuBeatmapStats implements IBeatmapStats {
    readonly ar: number;
    readonly cs: number;
    readonly od: number;
    readonly hp: number;

    readonly bpm: number;
    readonly length: number;
    readonly stars: number;

    private mode: number;

    constructor(
        ar: number,
        hp: number,
        od: number,
        cs: number,
        bpm: number,
        length: number,
        stars: number,
        mode: number
    ) {
        this.ar = ar;
        this.hp = hp;
        this.od = od;
        this.cs = cs;
        this.bpm = bpm;
        this.length = length;
        this.stars = stars;
        this.mode = mode;
    }

    toString(): string {
        const time = Util.formatBeatmapLength(this.length);
        let attrs: string;
        if (this.mode == 3) {
            attrs = `Keys: ${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
        } else {
            attrs = `AR:${Util.round(this.ar, 2)} CS:${Util.round(this.cs, 2)} OD:${Util.round(this.od, 2)} HP:${Util.round(this.hp, 2)}`;
        }
        const bpm = `${this.bpm.toFixed(0)}BPM`;
        const stars = `${this.stars.toFixed(2)}✩`;

        return `${time} | ${attrs} | ${bpm} | ${stars}`;
    }
}

export class OsuBeatmap implements IBeatmap {
    readonly id: number;
    readonly setId: number;
    readonly hash: string;
    mode: number;

    readonly title: string;
    readonly artist: string;

    readonly version: string;
    readonly author: string;
    readonly status: string;

    maxCombo: number;
    hitObjectsCount: number;

    stats: OsuBeatmapStats;

    private mods: Mods;

    readonly native_mode: number;
    readonly native_length: number;

    constructor(apiBeatmap?: APIBeatmap, dbBeatmap?: IOsuBeatmapMetadata) {
        if (apiBeatmap) {
            this.mode = apiBeatmap.mode;
            this.native_mode = apiBeatmap.mode;
            this.native_length = apiBeatmap.length;
            this.id = apiBeatmap.id.map;
            this.setId = apiBeatmap.id.set;
            this.hash = apiBeatmap.id.hash;
            this.title = apiBeatmap.title;
            this.artist = apiBeatmap.artist;
            this.version = apiBeatmap.version;
            this.author = apiBeatmap.creator.nickname;
            this.status = String(apiBeatmap.status);
            this.maxCombo = apiBeatmap.combo;
            this.hitObjectsCount =
                apiBeatmap.objects.circles + apiBeatmap.objects.sliders + apiBeatmap.objects.spinners;
            this.stats = new OsuBeatmapStats(
                apiBeatmap.stats.ar,
                apiBeatmap.stats.hp,
                apiBeatmap.stats.od,
                apiBeatmap.stats.cs,
                apiBeatmap.bpm,
                apiBeatmap.length,
                apiBeatmap.diff.stars,
                this.mode
            );
        } else if (dbBeatmap) {
            this.native_mode = dbBeatmap.native_mode;
            this.native_length = dbBeatmap.native_length;
            this.id = dbBeatmap.id;
            this.setId = dbBeatmap.set_id;
            this.hash = dbBeatmap.hash;
            this.title = dbBeatmap.title;
            this.artist = dbBeatmap.artist;
            this.version = dbBeatmap.version;
            this.author = dbBeatmap.author;
            this.status = dbBeatmap.status;
        }

        this.mods = new Mods([]);
    }

    async asMode(mode: number): Promise<void> {
        this.mode = mode;
        await this.applyMods(this.mods);
    }

    async applyMods(mods: Mods): Promise<void> {
        this.mods = mods;
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

        this.hitObjectsCount = diffCalc.nObjects;
        this.maxCombo = diffCalc.maxCombo;

        this.stats = new OsuBeatmapStats(
            calc.calculateMultipliedAR(),
            calc.calculateMultipliedHP(),
            calc.calculateMultipliedOD(),
            calc.calculateMultipliedCS(),
            rmap.bpm * mods.speed(),
            this.native_length / mods.speed(),
            diffCalc.stars,
            this.mode
        );
    }
}
