import { Module } from "../../Module";

import { Bot } from "../../Bot";
import GatariUser from "./User";
import GatariNick from "./Nick";
import GatariMode from "./Mode";
import GatariTop from "./Top";
import GatariRecent from "./Recent";
import GatariCompare from "./Compare";
import GatariChat from "./Chat";
import GatariFind from "./Find";
import GatariLeaderboard from "./Leaderboard";

export default class Gatari extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["g", "п"], bot);

        this.name = "Gatari";

        this.link = "https://osu.gatari.pw";

        this.registerCommand([
            new GatariUser(this),
            new GatariNick(this),
            new GatariMode(this),
            new GatariFind(this),
            new GatariTop(this),
            new GatariRecent(this),
            new GatariCompare(this),
            new GatariChat(this),
            new GatariLeaderboard(this)
        ]);
    }
}