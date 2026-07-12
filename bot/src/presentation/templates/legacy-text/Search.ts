import { IBeatmapsetSearchResult } from "games/osu/search/IBeatmapsetSearchResult";

export function formatSearchResults(sets: IBeatmapsetSearchResult[]): string {
    return sets
        .map((set) => `${set.artist} - ${set.title} by ${set.creator} | https://osu.ppy.sh/s/${set.id}`)
        .join("\n");
}
