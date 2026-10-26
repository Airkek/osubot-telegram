import { IExtendedMod } from "games/osu/performance/IExtendedMod";

export interface IOsuV2Score {
    id: number;
    mods: IExtendedMod[];
    accuracy: number;
    statistics: {
        great: number;
        ok: number;
        miss: number;
        meh: number;

        // mania:
        perfect?: number; // geki
        good?: number; // katu

        // std lazer slider stats:
        large_tick_hit?: number;
        large_tick_miss?: number;
        small_tick_hit?: number;
        small_tick_miss?: number;
        slider_tail_hit?: number;
    };
    ruleset_id: number;
    ended_at: string;
    pp?;
    rank: string;
    total_score: number;
    legacy_total_score: number;
    max_combo: number;
    beatmap: {
        id: number;
    };
    passed: boolean;
    rank_global?: number;
    processed?: boolean;
    preserve?: boolean;
    ranked?: boolean;
    user_id?: number;

    has_replay: boolean;
}
