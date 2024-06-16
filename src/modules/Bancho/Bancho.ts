import { Module } from "../../Module";

import { Bot } from "../../Bot";
import BanchoUser from "./User";
import BanchoNick from "./Nick";
import BanchoMode from "./Mode";
import BanchoTop from "./Top";
import BanchoRecent from "./Recent";
import BanchoCompare from "./Compare";
import BanchoChat from "./Chat";
import BanchoFind from "./Find";
import BanchoLeaderboard from "./Leaderboard";
import BanchoTrack from "./Track";

export default class Bancho extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["s", "ы"], bot);

        this.name = "Bancho";

        this.link = "https://osu.ppy.sh";
        
        this.registerCommand([
            new BanchoUser(this),
            new BanchoNick(this),
            new BanchoMode(this),
            new BanchoFind(this),
            new BanchoTop(this),
            new BanchoRecent(this),
            new BanchoCompare(this),
            new BanchoChat(this),
            new BanchoLeaderboard(this),
            new BanchoTrack(this)
        ]);
    }
}