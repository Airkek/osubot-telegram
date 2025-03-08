import { Module } from "../../Module";

import { Bot } from "../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractMode from "../BaseServerCommands/Mode";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractLeaderboard from "../BaseServerCommands/Leaderboard";
import AbstractCompare from "../BaseServerCommands/Compare";

export default class Ripple extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["r", "к"], bot);

        this.name = "Ripple";
        this.link = "https://ripple.moe";
        this.api = bot.api.ripple;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.ripple;

        this.registerCommand([
            new AbstractUser(this),
            new AbstractFind(this),
            new AbstractTop(this),
            new AbstractRecent(this),
            new AbstractChat(this),
            new AbstractCompare(this),
            new AbstractMode(this),
            new AbstractNick(this),
            new AbstractLeaderboard(this),
        ]);
    }
}
