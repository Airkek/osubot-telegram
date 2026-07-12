import { ServerModule } from "commands/ServerModule";

import { IBotRuntime } from "core/IBotRuntime";
import { BanchoLink } from "commands/modules/bancho/BanchoLink";
import { BanchoTrack } from "commands/modules/bancho/BanchoTrack";
import { UserCommand } from "commands/modules/server/UserCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";
import { FindCommand } from "commands/modules/server/FindCommand";
import { LeaderboardCommand } from "commands/modules/server/LeaderboardCommand";
import { CompareCommand } from "commands/modules/server/CompareCommand";

export class Bancho extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["s", "ы"], bot);

        this.name = "Bancho";
        this.link = "https://osu.ppy.sh";
        this.api = bot.api.bancho;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.bancho;

        this.registerCommand([
            new UserCommand(this),
            new BanchoLink(this),
            new ModeCommand(this),
            new FindCommand(this),
            new TopCommand(this),
            new RecentCommand(this),
            new CompareCommand(this),
            new ChatCommand(this),
            new LeaderboardCommand(this),
            new BanchoTrack(this),
        ]);
    }
}
