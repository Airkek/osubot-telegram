import Util from '../Util';
import { APIUser } from '../Types';

export default function(user: APIUser, mode: number, status: string, link: string) {
    return `Player: ${user.nickname} ${status} (${Util.profileModes[mode]})
Rank: #${user.rank.total} (${user.country} #${user.rank.country})
Playcount: ${user.playcount}` + (user.level ? ` (Lv${Math.floor(user.level)})` : '') + (user.playtime ? `
Playtime: ${Util.minutesToPlaytimeString(user.playtime)}` : '') + `
PP: ${Math.round(user.pp)}
Accuracy: ${Util.round(user.accuracy, 2)}%

${link}/u/${user.id}`;
}
