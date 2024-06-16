import { Module } from "../../Module";

import { Bot } from "../../Bot";
import RippleUser from "./User";
import RippleTop from "./Top";
import RippleRecent from "./Recent";
import RippleChat from "./Chat";
import RippleCompare from "./Compare";
import RippleMode from "./Mode";
import RippleNick from "./Nick";
import RippleFind from "./Find";
import RippleLeaderboard from "./Leaderboard";

export default class Ripple extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["r", "к"], bot);

        this.name = "Ripple";

        this.link = "https://ripple.moe";

        this.registerCommand([
            new RippleUser(this),
            new RippleFind(this),
            new RippleTop(this),
            new RippleRecent(this),
            new RippleChat(this),
            new RippleCompare(this),
            new RippleMode(this),
            new RippleNick(this),
            new RippleLeaderboard(this)
        ]);
    }
}