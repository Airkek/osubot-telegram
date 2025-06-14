import Util from "../../Util";
import { APIUser } from "../../Types";
import { ILocalisator } from "../../ILocalisator";

export default function (l: ILocalisator, user: APIUser, mode: number, link: string) {
    return `${l.tr("player-name", {
        player_name: user.nickname,
    })} (${Util.profileModes[mode]})
${l.tr("player-rank")}: #${user.rank.total?.toLocaleString()} (${user.country} #${user.rank.country?.toLocaleString()})
${l.tr("player-playcount")}: ${user.playcount?.toLocaleString()}${user.level ? ` (Lv${Math.floor(user.level)})` : ""}${
        user.playtime
            ? `
${l.tr("player-playtime")}: ${Util.minutesToPlaytimeString(user.playtime)}`
            : ""
    }
PP: ${Math.round(user.pp)?.toLocaleString()}
${l.tr("player-accuracy")}: ${Util.round(user.accuracy, 2)}%

${link}/u/${user.id}`;
}
