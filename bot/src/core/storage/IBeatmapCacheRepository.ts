import type { OsuBeatmap } from "games/osu/beatmaps/OsuBeatmap";
import { IBeatmapMetadata } from "core/storage/IBeatmapMetadata";

export interface IBeatmapCacheRepository {
    getBeatmapById(id: number): Promise<IBeatmapMetadata | null>;
    getBeatmapByHash(hash: string): Promise<IBeatmapMetadata | null>;
    addToCache(beatmap: OsuBeatmap): Promise<void>;
}
