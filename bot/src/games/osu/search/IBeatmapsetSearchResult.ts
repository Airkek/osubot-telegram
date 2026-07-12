import { IBeatmapSearchResult } from "games/osu/search/IBeatmapSearchResult";

export interface IBeatmapsetSearchResult {
    id: number;
    title: string;
    artist: string;
    rankedDate: Date;
    creator: string;
    status: string;
    beatmaps: IBeatmapSearchResult[];
}
