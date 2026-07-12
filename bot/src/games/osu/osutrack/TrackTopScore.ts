import { Util } from "shared/Util";
import { HitCounts } from "games/scores/HitCounts";
import { Mods } from "games/osu/performance/Mods";

export class TrackTopScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    place: number;

    constructor(data, mode: number) {
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts(
            {
                300: Number(data.count300),
                100: Number(data.count100),
                50: Number(data.count50),
                miss: Number(data.countmiss),
                katu: Number(data.countkatu),
                geki: Number(data.countgeki),
            },
            mode
        );
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank;
        this.pp = Number(data.pp);
        this.mode = mode;
        this.place = data.ranking;
    }

    accuracy(): number {
        return Util.accuracy(this.counts);
    }
}
