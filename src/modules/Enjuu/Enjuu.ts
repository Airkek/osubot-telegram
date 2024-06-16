import { Module } from "../../Module";
import { Bot } from "../../Bot";
import EnjuuUser from "./User";
import EnjuuTop from "./Top";
import EnjuuNick from "./Nick";
import EnjuuMode from "./Mode";
import EnjuuChat from "./Chat";
import EnjuuFind from "./Find";
import EnjuuRecent from "./Recent";
import EnjuuCompare from "./Compare";
import EnjuuLeaderboard from "./Leaderboard";

export default class Enjuu extends Module {
    constructor(bot: Bot) {
        super(["e", "ej", "у", "уо"], bot);
        
        this.name = "Enjuu";

        this.link = "https://enjuu.click";

        this.registerCommand([
            new EnjuuNick(this),
            new EnjuuMode(this),
            new EnjuuUser(this),
            new EnjuuTop(this),
            new EnjuuChat(this),
            new EnjuuFind(this),
            new EnjuuRecent(this),
            new EnjuuCompare(this),
            new EnjuuLeaderboard(this)
        ]);
    }
}