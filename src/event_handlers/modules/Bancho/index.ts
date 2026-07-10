import { ServerModule } from "../Module";

import { BotRuntime } from "../../../core/BotRuntime";
import BanchoLink from "./Link";
import BanchoTrack from "./Track";
import AbstractUser from "../BaseServerCommands/User";
import AbstractMode from "../BaseServerCommands/Mode";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractLeaderboard from "../BaseServerCommands/Leaderboard";
import AbstractCompare from "../BaseServerCommands/Compare";

export default class Bancho extends ServerModule {
    constructor(bot: BotRuntime) {
        super(["s", "ы"], bot);

        this.name = "Bancho";
        this.link = "https://osu.ppy.sh";
        this.api = bot.api.bancho;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.bancho;

        this.registerCommand([
            new AbstractUser(this),
            new BanchoLink(this),
            new AbstractMode(this),
            new AbstractFind(this),
            new AbstractTop(this),
            new AbstractRecent(this),
            new AbstractCompare(this),
            new AbstractChat(this),
            new AbstractLeaderboard(this),
            new BanchoTrack(this),
        ]);
    }
}
