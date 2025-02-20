import Util from '../Util';
import { APIUser } from '../Types';

export default function(user: APIUser, mode: number, link: string) {
    return `Player: ${user.nickname} (${Util.profileModes[mode]})
Rank: #${user.rank.total.toLocaleString()} (${user.country} #${user.rank.country.toLocaleString()})
Playcount: ${user.playcount.toLocaleString()}${user.level ? ` (Lv${Math.floor(user.level)})` : ''}${user.playtime ? `
Playtime: ${Util.minutesToPlaytimeString(user.playtime)}` : ''}
PP: ${Math.round(user.pp).toLocaleString()}
Accuracy: ${Util.round(user.accuracy, 2)}%

${link}/u/${user.id}`;
}
