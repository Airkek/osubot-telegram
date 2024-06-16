import { Module } from "../../Module";

import { Bot } from "../../Bot";
import KurikkuUser from "./User";
import KurikkuTop from "./Top";
import KurikkuRecent from "./Recent";
import KurikkuChat from "./Chat";
import KurikkuCompare from "./Compare";
import KurikkuMode from "./Mode";
import KurikkuNick from "./Nick";
import KurikkuFind from "./Find";
import KurikkuLeaderboard from "./Leaderboard";

export default class Kurikku extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["k", "л"], bot);

        this.name = "Kurikku";

        this.link = "https://kurikku.pw";

        this.registerCommand([
            new KurikkuUser(this),
            new KurikkuFind(this),
            new KurikkuTop(this),
            new KurikkuRecent(this),
            new KurikkuChat(this),
            new KurikkuCompare(this),
            new KurikkuMode(this),
            new KurikkuNick(this),
            new KurikkuLeaderboard(this)
        ]);
    }
}