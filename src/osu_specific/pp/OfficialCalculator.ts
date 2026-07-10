import path from "node:path";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { IHits } from "../../Types";
import Mods, { ExtendedMod } from "./Mods";
import { getBeatmapFile } from "./BeatmapFileCache";
import client from "./OfficialCalculatorClient";

export interface OfficialBeatmapAttributes {
    native_mode: number;
    star_rating: number;
    max_combo: number;
    hit_object_count: number;
    approach_rate: number;
    circle_size: number;
    overall_difficulty: number;
    drain_rate: number;
    bpm: number;
    clock_rate: number;
}

export interface OfficialPerformanceAttributes {
    difficulty: OfficialBeatmapAttributes;
    pp: number;
    fc_pp: number;
    ss_pp: number;
}

export interface OfficialScoreInput {
    accuracy: number;
    combo?: number;
    total_score: number;
    legacy: boolean;
    standardised: boolean;
    simulate: boolean;
    statistics: Record<string, number>;
}

export interface OfficialReplayHeader {
    mode: number;
    version: number;
    beatmap_hash: string;
}

export interface OfficialReplay {
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
    mods: ExtendedMod[];
    legacy: boolean;
    frame_count: number;
}

function performanceMods(mods: Mods): ExtendedMod[] {
    return mods.toExtendedMods();
}

export async function calculateBeatmap(map: IBeatmap, mode: number, mods: Mods): Promise<OfficialBeatmapAttributes> {
    const beatmapPath = await getBeatmapFile(map);
    return await client.request<OfficialBeatmapAttributes>({
        operation: "beatmap",
        beatmap_path: path.resolve(beatmapPath),
        mode,
        mods: performanceMods(mods),
    });
}

export async function calculatePerformance(
    map: IBeatmap,
    mode: number,
    mods: Mods,
    score: OfficialScoreInput
): Promise<OfficialPerformanceAttributes> {
    const beatmapPath = await getBeatmapFile(map);
    return await client.request<OfficialPerformanceAttributes>({
        operation: "performance",
        beatmap_path: path.resolve(beatmapPath),
        mode,
        mods: performanceMods(mods),
        score,
    });
}

export async function readReplayHeader(replayPath: string): Promise<OfficialReplayHeader> {
    return await client.request<OfficialReplayHeader>({
        operation: "replay_header",
        replay_path: path.resolve(replayPath),
    });
}

export async function decodeReplay(replayPath: string, map: IBeatmap): Promise<OfficialReplay> {
    const beatmapPath = await getBeatmapFile(map);
    return await client.request<OfficialReplay>({
        operation: "replay",
        replay_path: path.resolve(replayPath),
        beatmap_path: path.resolve(beatmapPath),
    });
}

export function hitStatistics(hits: IHits, mode: number): Record<string, number> {
    if (mode === 2) {
        return {
            great: hits[300] ?? 0,
            large_tick_hit: hits[100] ?? 0,
            small_tick_hit: hits[50] ?? 0,
            small_tick_miss: hits.katu ?? 0,
            large_tick_miss: hits.large_tick_miss ?? 0,
            miss: hits.miss ?? 0,
        };
    }

    const statistics: Record<string, number> = {
        great: hits[300] ?? 0,
        ok: hits[100] ?? 0,
        meh: hits[50] ?? 0,
        miss: hits.miss ?? 0,
    };
    if (mode === 3) {
        statistics.good = hits.katu ?? 0;
        statistics.perfect = hits.geki ?? 0;
    }
    if (hits.slider_large !== undefined) {
        statistics.large_tick_hit = hits.slider_large;
    }
    if (hits.slider_tail !== undefined) {
        statistics.slider_tail_hit = hits.slider_tail;
    }
    if (hits.small_tick_miss !== undefined) {
        statistics.small_tick_miss = hits.small_tick_miss;
    }
    if (hits.large_tick_miss !== undefined) {
        statistics.large_tick_miss = hits.large_tick_miss;
    }
    return statistics;
}
