import { IHitStatistics } from "games/scores/IHitStatistics";
import { IBeatmap } from "games/IBeatmap";
import { Mods } from "games/osu/performance/Mods";
import { IExtendedMod } from "games/osu/performance/IExtendedMod";
import { IOfficialReplay } from "games/osu/performance/IOfficialReplay";
import { performanceClient } from "infrastructure/performance/PerformanceClient";

interface OfficialBeatmapAttributes {
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

interface OfficialPerformanceAttributes {
    difficulty: OfficialBeatmapAttributes;
    pp: number;
    fc_pp: number;
    ss_pp: number;
}

interface OfficialScoreInput {
    accuracy: number;
    combo?: number;
    total_score: number;
    legacy: boolean;
    standardised: boolean;
    simulate: boolean;
    statistics: Record<string, number>;
}

interface OfficialReplayHeader {
    mode: number;
    version: number;
    beatmap_hash: string;
}

interface BeatmapReference {
    beatmap_id: number;
    expected_md5: string;
}

interface PerformanceMod {
    acronym: string;
    settings_json: string;
}

interface PerformanceReplay extends Omit<IOfficialReplay, "mods"> {
    mods: PerformanceMod[];
    _legacy_total_score?: "legacy_total_score";
}

function beatmapReference(map: IBeatmap): BeatmapReference {
    return {
        beatmap_id: map.id,
        expected_md5: map.hash,
    };
}

function performanceMods(mods: Mods): PerformanceMod[] {
    return mods.toExtendedMods().map((mod) => ({
        acronym: mod.acronym,
        settings_json: JSON.stringify(mod.settings ?? {}),
    }));
}

export async function calculateBeatmap(map: IBeatmap, mode: number, mods: Mods): Promise<OfficialBeatmapAttributes> {
    return await performanceClient.request<OfficialBeatmapAttributes>("calculateBeatmap", {
        beatmap: beatmapReference(map),
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
    return await performanceClient.request<OfficialPerformanceAttributes>("calculatePerformance", {
        beatmap: beatmapReference(map),
        mode,
        mods: performanceMods(mods),
        score,
    });
}

export async function readReplayHeader(replay: Buffer): Promise<OfficialReplayHeader> {
    return await performanceClient.request<OfficialReplayHeader>("readReplayHeader", {
        replay,
    });
}

export async function decodeReplay(replay: Buffer, map: IBeatmap): Promise<IOfficialReplay> {
    const decoded = await performanceClient.request<PerformanceReplay>("decodeReplay", {
        replay,
        beatmap: beatmapReference(map),
    });
    const { mods, legacy_total_score, _legacy_total_score, ...replayData } = decoded;
    return {
        ...replayData,
        ...(_legacy_total_score ? { legacy_total_score } : {}),
        mods: mods.map((mod) => {
            const settings = JSON.parse(mod.settings_json || "{}") as IExtendedMod["settings"];
            return Object.keys(settings).length > 0 ? { acronym: mod.acronym, settings } : { acronym: mod.acronym };
        }),
    };
}

export function hitStatistics(hits: IHitStatistics, mode: number): Record<string, number> {
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
