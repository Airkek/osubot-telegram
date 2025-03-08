import { IBeatmapStats, IBeatmap } from "../BeatmapTypes";
import { APIBeatmap } from "../../Types";
import Mods from "../../pp/Mods";
import Util from "../../Util";

export class BeatLeaderBeatmapStats implements IBeatmapStats {
    readonly stars: number;
    readonly bpm: number;
    readonly length: number;

    constructor(stars: number, bpm: number, length: number) {
        this.stars = stars;
        this.bpm = bpm;
        this.length = length;
    }

    toString(): string {
        return `${Util.formatBeatmapLength(this.length)} | ${this.bpm}BPM | ${this.stars.toFixed(2)}✩`;
    }
}

export class BeatLeaderBeatmap implements IBeatmap {
    readonly id: number;
    readonly setId: number;
    readonly hash: string;
    readonly mode: number;
    readonly native_mode: number;

    readonly title: string;
    readonly artist: string;

    readonly version: string;
    readonly author: string;
    readonly status: string;

    readonly maxCombo: number;
    readonly hitObjectsCount: number;

    stats: BeatLeaderBeatmapStats;

    url: string;
    coverUrl: string;

    constructor(apiBeatmap: APIBeatmap) {
        this.id = apiBeatmap.id.map;
        this.setId = apiBeatmap.id.set;
        this.hash = apiBeatmap.id.hash;
        this.mode = apiBeatmap.mode;
        this.native_mode = apiBeatmap.mode;
        this.title = apiBeatmap.title;
        this.artist = apiBeatmap.artist;
        this.version = apiBeatmap.version;
        this.author = apiBeatmap.creator.nickname;
        this.status = apiBeatmap.status;
        this.maxCombo = apiBeatmap.combo;
        this.hitObjectsCount = 0;
        this.stats = new BeatLeaderBeatmapStats(apiBeatmap.diff.stars, apiBeatmap.bpm, apiBeatmap.length);

        this.url = apiBeatmap.mapUrl;
        this.coverUrl = apiBeatmap.coverUrl;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async asMode(mode: number): Promise<void> {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async applyMods(mods: Mods): Promise<void> {}
}
