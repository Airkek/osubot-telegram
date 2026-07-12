import { IGameUser } from "games/users/IGameUser";
import { Util } from "shared/Util";
import { ILocalizer } from "localization/ILocalizer";

export function formatUser(l: ILocalizer, user: IGameUser, link: string): string {
    const rankedPlay = user.rankedPlay
        ? `\n${l.tr("player-ranked-play")}: ${user.rankedPlay.rank ? `#${user.rankedPlay.rank.toLocaleString()}` : "—"} · ${l.tr("player-ranked-play-rating")}: ${user.rankedPlay.rating.toLocaleString()}${user.rankedPlay.provisional ? "*" : ""} · ${l.tr("player-ranked-play-wins")}: ${user.rankedPlay.wins.toLocaleString()} · ${l.tr("player-ranked-play-games")}: ${user.rankedPlay.plays.toLocaleString()}`
        : "";

    return `${l.tr("player-name", {
        player_name: user.nickname,
    })} (${Util.profileModes[user.mode]})
${l.tr("player-rank")}: #${user.rank.total?.toLocaleString()} (${user.country} #${user.rank.country?.toLocaleString()})
${l.tr("player-playcount")}: ${user.playcount?.toLocaleString()}${user.level ? ` (Lv${Math.floor(user.level)})` : ""}${
        user.playtime
            ? `
${l.tr("player-playtime")}: ${Util.minutesToPlaytimeString(user.playtime)}`
            : ""
    }
PP: ${Math.round(user.pp)?.toLocaleString()}
${l.tr("player-accuracy")}: ${user.accuracy.toFixed(2)}%${rankedPlay}

${link}/u/${user.id}`;
}
