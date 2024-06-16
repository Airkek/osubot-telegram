import { Module } from "../../Module";
import { Bot } from "../../Bot";
import AkatsukiUser from "./User";
import AkatsukiTop from "./Top";
import AkatsukiNick from "./Nick";
import AkatsukiMode from "./Mode";
import AkatsukiChat from "./Chat";
import AkatsukiFind from "./Find";
import AkatsukiRecent from "./Recent";

export default class Akatsuki extends Module {
    constructor(bot: Bot) {
        super(["a", "ф"], bot);
        
        this.name = "Akatsuki";

        this.link = "https://akatsuki.pw";

        this.registerCommand([
            new AkatsukiNick(this),
            new AkatsukiMode(this),
            new AkatsukiUser(this),
            new AkatsukiTop(this),
            new AkatsukiChat(this),
            new AkatsukiFind(this),
            new AkatsukiRecent(this)
        ]);
    }
}