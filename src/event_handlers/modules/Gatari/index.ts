import { ServerModule } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractMode from "../BaseServerCommands/Mode";
import AbstractLeaderboard from "../BaseServerCommands/Leaderboard";
import AbstractCompare from "../BaseServerCommands/Compare";

export default class Gatari extends ServerModule {
    constructor(bot: BotRuntime) {
        super(["g", "п"], bot);

        this.name = "Gatari";
        this.link = "https://osugatari.ru";
        this.api = bot.api.gatari;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.gatari;

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
