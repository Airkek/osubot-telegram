import { IOsuTrackResult } from "games/osu/osutrack/IOsuTrackResult";
import { ILocalizer } from "localization/ILocalizer";

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

export function formatTrack(l: ILocalizer, response: IOsuTrackResult): string {
    return `${l.tr("player-name", { player_name: response.username })} (${modeStr(response.mode)}):
${l.tr("osutrack-rank-pp", {
    rank: formatChange(response.rank),
    pp: formatChangeFloat(response.pp),
    playcount: response.playcount,
})}
${l.tr("osutrack-detailed-data-url", { url: `https://ameobea.me/osutrack/user/${encodeURI(response.username)}${modeUrl(response.mode)}` })}

${l.tr("osutrack-new-highscores", { count: response.highscores.length })}
${response.highscores
    .slice(0, MAX_SCORES)
    .map((score) => `#${score.place + 1}. ${score.pp.toFixed(2)}pp https://osu.ppy.sh/b/${score.beatmapId}`)
    .join(
        "\n"
    )}${response.highscores.length > MAX_SCORES ? `\n${l.tr("osutrack-and-scores-more", { count: response.highscores.length - MAX_SCORES })}` : ""}`.trim();
}
