import { Module } from "../../Module";

import Bot from "../../Bot";
import GatariUser from "./User";
import GatariNick from "./Nick";
import GatariMode from "./Mode";
import GatariTop from "./Top";
import GatariRecent from "./Recent";
import GatariCompare from "./Compare";
import GatariChat from "./Chat";

export default class Gatari extends Module {
    link: string;
    constructor(bot: Bot) {
        super("gt", bot);

        this.name = "Gatari";

        this.link = "https://osu.gatari.pw";

        this.registerCommand([
            new GatariUser(this),
            new GatariNick(this),
            new GatariMode(this),
            new GatariTop(this),
            new GatariRecent(this),
            new GatariCompare(this),
            new GatariChat(this)
        ]);
    }
}