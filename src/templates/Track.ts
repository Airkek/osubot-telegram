import { OsuTrackResponse } from "../Types";

function formatChange(num: number): string {
    return num < 0 ? String(num) : `+${num}`;
}

export default function (response: OsuTrackResponse): string {
    return `User ${response.username}:
Rank: ${formatChange(response.rank)} (${formatChange(response.pp)} pp) in ${response.playcount} plays
View detailed data here: https://ameobea.me/osutrack/user/${encodeURI(response.username)}

${
    response.highscores.length == 0
        ? ""
        : `${response.highscores.length} new highscores:\n${response.highscores
              .slice(0, 3)
              .map(
                  (score) =>
                      `#${score.place + 1}. ${score.pp}pp https://osu.ppy.sh/b/${score.beatmapId}`
              )
              .join(
                  "\n"
              )}${response.highscores.length > 3 ? " and more.." : ""}`
}`;
}
