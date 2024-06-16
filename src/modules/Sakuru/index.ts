import { Bot } from "../../Bot";
import { Module } from "../../Module";
import SakuruChat from "./Chat";
import SakuruCompare from "./Compare";
import SakuruFind from "./Find";
import SakuruLeaderboard from "./Leaderboard";
import SakuruMode from "./Mode";
import SakuruNick from "./Nick";
import SakuruRecent from "./Recent";
import SakuruTop from "./Top";
import SakuruUser from "./User";

export default class Sakuru extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["c"], bot);

        this.name = "Sakuru";
        
        this.link = "https://sakuru.pw";

        this.registerCommand([
            new SakuruNick(this),
            new SakuruMode(this),
            new SakuruUser(this),
            new SakuruTop(this),
            new SakuruRecent(this),
            new SakuruCompare(this),
            new SakuruLeaderboard(this),
            new SakuruChat(this),
            new SakuruFind(this)
        ]);
    }
}