import { Module } from "../../Module";

import { Bot } from "../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractMode from "../BaseServerCommands/Mode";
import AbstractLeaderboard from "../BaseServerCommands/Leaderboard";
import AbstractCompare from "../BaseServerCommands/Compare";

export default class Gatari extends Module {
    link: string;
    constructor(bot: Bot) {
        super(["g", "п"], bot);

        this.name = "Gatari";
        this.link = "https://osu.gatari.pw";
        this.api = bot.api.gatari;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.gatari;

        this.registerCommand([
            new AbstractUser(this),
            new AbstractNick(this),
            new AbstractMode(this),
            new AbstractFind(this),
            new AbstractTop(this),
            new AbstractRecent(this),
            new AbstractCompare(this),
            new AbstractChat(this),
            new AbstractLeaderboard(this),
        ]);
    }
}
