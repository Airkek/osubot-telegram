import { Module } from "../../Module";
import { Bot } from "../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import Nick from "./Nick";
import Id from "./Id";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractTop from "../BaseServerCommands/Top";

export default class BeatLeader extends Module {
    constructor(bot: Bot) {
        super(["bl", "ид"], bot);
        
        this.name = "BeatLeader";
        this.link = "https://beatleader.xyz";
        this.api = bot.api.saber;
        this.db = bot.database.servers.saber;
        this.statusGetter = "beatleader";

        this.registerCommand([
            new Nick(this),
            new Id(this),
            new AbstractUser(this),
            new AbstractRecent(this),
            new AbstractTop(this)
        ]);
    }
}