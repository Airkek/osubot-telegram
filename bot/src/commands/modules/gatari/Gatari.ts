import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";
import { FindCommand } from "commands/modules/server/FindCommand";
import { NickCommand } from "commands/modules/server/NickCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";
import { LeaderboardCommand } from "commands/modules/server/LeaderboardCommand";
import { CompareCommand } from "commands/modules/server/CompareCommand";

export class Gatari extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["g", "п"], bot);

        this.name = "Gatari";
        this.link = "https://osugatari.ru";
        this.api = bot.api.gatari;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.gatari;

        this.registerCommand([
            new UserCommand(this),
            new NickCommand(this),
            new ModeCommand(this),
            new FindCommand(this),
            new TopCommand(this),
            new RecentCommand(this),
            new CompareCommand(this),
            new ChatCommand(this),
            new LeaderboardCommand(this),
        ]);
    }
}
