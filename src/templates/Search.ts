import { V2Beatmapset } from "../Types";

export default function (sets: V2Beatmapset[]): string {
    return sets
        .map(
            (set) =>
                `${set.artist} - ${set.title} by ${set.creator} | https://osu.ppy.sh/s/${set.id}`
        )
        .join("\n");
}
