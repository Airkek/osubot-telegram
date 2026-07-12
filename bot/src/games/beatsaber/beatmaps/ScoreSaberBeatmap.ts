import { IBeatmapData } from "games/beatmaps/IBeatmapData";
import { IBeatmapStats } from "games/IBeatmapStats";
import { IBeatmap } from "games/IBeatmap";
import { Mods } from "games/osu/performance/Mods";

class ScoreSaberBeatmapStats implements IBeatmapStats {
    stars: number;

    constructor(stars: number) {
        this.stars = stars;
    }

    toString(): string {
        return `${this.stars.toFixed(2)}✩`;
    }
}

export class ScoreSaberBeatmap implements IBeatmap {
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

    stats: ScoreSaberBeatmapStats;

    url: string;
    coverUrl: string;

    constructor(apiBeatmap: IBeatmapData) {
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
        this.stats = new ScoreSaberBeatmapStats(apiBeatmap.diff.stars);

        this.url = apiBeatmap.mapUrl;
        this.coverUrl = apiBeatmap.coverUrl;
    }

    get currentMods(): Mods {
        return new Mods(0);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async asMode(mode: number): Promise<void> {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async applyMods(mods: Mods): Promise<void> {}
}
