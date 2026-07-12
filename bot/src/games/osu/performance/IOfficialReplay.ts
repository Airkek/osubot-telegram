import { IExtendedMod } from "games/osu/performance/IExtendedMod";

export interface IOfficialReplay {
    mode: number;
    beatmap_hash: string;
    beatmap_id: number;
    player: string;
    player_id: number;
    statistics: Record<string, number>;
    total_score: number;
    legacy_total_score?: number;
    combo: number;
    perfect: boolean;
    accuracy: number;
    date: string;
    mods: IExtendedMod[];
    legacy: boolean;
    frame_count: number;
}
