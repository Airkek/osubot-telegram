import { IBeatmapsetSearchResult } from "games/osu/search/IBeatmapsetSearchResult";

export interface ISearchTemplate {
    (sets: IBeatmapsetSearchResult[]): string;
}
