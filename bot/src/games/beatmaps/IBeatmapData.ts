import { IBeatmapDataStats } from "games/beatmaps/IBeatmapDataStats";
import { IBeatmapObjectData } from "games/beatmaps/IBeatmapObjectData";
import { IBeatmapStarData } from "games/beatmaps/IBeatmapStarData";

export interface IBeatmapData {
    artist: string;
    id: {
        set: number;
        map: number;
        hash: string;
    };
    bpm: number;
    creator: {
        nickname: string;
        id: number;
    };
    status: string;
    stats: IBeatmapDataStats;
    diff: IBeatmapStarData;
    objects: IBeatmapObjectData;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;
    coverUrl?: string;
    mapUrl?: string;
}
