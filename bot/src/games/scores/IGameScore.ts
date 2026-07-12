import { IBeatmap } from "games/IBeatmap";
import { Mods } from "games/osu/performance/Mods";
import { IHitCounts } from "games/scores/IHitCounts";

export interface IGameScore {
    api_score_id?: number;
    beatmapId: number;
    score: number;
    combo: number;
    counts: IHitCounts;
    mods: Mods;
    mode: number;
    rank?: string;
    rank_global?: number;
    top100_number?: number;
    date?: Date;
    pp?: number;
    fcPp?: number;
    beatmap?: IBeatmap;
    player_id?: number;
    fake?: boolean;
    standardised?: boolean;
    has_replay?: boolean;
    accuracy(): number;
}
