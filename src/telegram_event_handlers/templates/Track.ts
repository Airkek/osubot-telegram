import { OsuTrackResponse } from "../../Types";

function formatChange(num: number): string {
    return num < 0 ? String(num) : `+${num}`;
}

function formatChangeFloat(num: number): string {
    return num < 0 ? num.toFixed(2) : `+${num.toFixed(2)}`;
}

function modeStr(mode: number): string {
    switch (mode) {
        case 0:
            return "osu!";
        case 1:
            return "osu!taiko";
        case 2:
            return "osu!catch";
        case 3:
            return "osu!mania";
        default:
            return "unknown mode";
    }
}

function modeUrl(mode: number): string {
    switch (mode) {
        case 1:
            return "/taiko";
        case 2:
            return "/ctb";
        case 3:
            return "/mania";
        default:
            return "";
    }
}

const MAX_SCORES: number = 5;

export default function (response: OsuTrackResponse): string {
    return `User ${response.username} (${modeStr(response.mode)}):
Rank: ${formatChange(response.rank)} (${formatChangeFloat(response.pp)} pp) in ${response.playcount} plays
View detailed data here: https://ameobea.me/osutrack/user/${encodeURI(response.username)}${modeUrl(response.mode)}

${
    response.highscores.length == 0
        ? ""
        : `${response.highscores.length} new highscores:\n${response.highscores
              .slice(0, MAX_SCORES)
              .map((score) => `#${score.place + 1}. ${score.pp.toFixed(2)}pp https://osu.ppy.sh/b/${score.beatmapId}`)
              .join(
                  "\n"
              )}${response.highscores.length > MAX_SCORES ? `\nand ${response.highscores.length - MAX_SCORES} scores more...` : ""}`
}`.trim();
}
