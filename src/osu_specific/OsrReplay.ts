import { APIScore, HitCounts } from "../Types";
import Mods from "./pp/Mods";
import { OfficialReplay } from "./pp/OfficialCalculator";

class OsrReplay implements APIScore {
    mode: number;
    beatmapHash: string;
    player: string;
    player_id: number;
    counts: HitCounts;
    score: number;
    combo: number;
    perfect: number;
    mods: Mods;
    beatmapId: number;
    rank?: string;
    date: Date;
    fake?: boolean = false;
    standardised = true;
    frameCount: number;
    private readonly accuracyValue: number;

    constructor(score: OfficialReplay) {
        this.mode = score.mode;
        this.beatmapHash = score.beatmap_hash;
        this.player = score.player;
        this.player_id = score.player_id;
        this.counts = new HitCounts(
            {
                300: score.statistics.great ?? 0,
                100: this.mode === 2 ? (score.statistics.large_tick_hit ?? 0) : (score.statistics.ok ?? 0),
                50: this.mode === 2 ? (score.statistics.small_tick_hit ?? 0) : (score.statistics.meh ?? 0),
                geki: score.statistics.perfect ?? 0,
                katu: this.mode === 2 ? (score.statistics.small_tick_miss ?? 0) : (score.statistics.good ?? 0),
                miss: (score.statistics.miss ?? 0) + (this.mode === 2 ? (score.statistics.large_tick_miss ?? 0) : 0),
                slider_large: score.statistics.large_tick_hit,
                slider_tail: score.statistics.slider_tail_hit,
                small_tick_miss: score.statistics.small_tick_miss,
                large_tick_miss: score.statistics.large_tick_miss,
            },
            this.mode
        );
        this.score = score.legacy_total_score ?? score.total_score;
        this.combo = score.combo;
        this.perfect = score.perfect ? 1 : 0;
        this.beatmapId = score.beatmap_id;
        this.date = new Date(score.date);
        this.mods = new Mods(score.mods);
        this.frameCount = score.frame_count;
        this.accuracyValue = score.accuracy;
    }

    accuracy() {
        return this.accuracyValue;
    }
}

export { OsrReplay };
