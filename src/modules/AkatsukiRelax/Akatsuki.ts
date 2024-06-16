import { Module } from "../../Module";
import { Bot } from "../../Bot";
import AkatsukiRelaxUser from "./User";
import AkatsukiRelaxTop from "./Top";
import AkatsukiRelaxRecent from "./Recent";

export default class AkatsukiRelax extends Module {
    constructor(bot: Bot) {
        super(["ax", "фч"], bot);
        
        this.name = "Akatsuki!Relax";

        this.link = "https://akatsuki.gg";

        this.registerCommand([
            new AkatsukiRelaxUser(this),
            new AkatsukiRelaxTop(this),
            new AkatsukiRelaxRecent(this)
        ]);
    }
}