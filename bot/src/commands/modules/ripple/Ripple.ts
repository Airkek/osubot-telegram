import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";
import { FindCommand } from "commands/modules/server/FindCommand";
import { NickCommand } from "commands/modules/server/NickCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";

export class Ripple extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["r", "к"], bot);

        this.name = "Ripple";
        this.link = "https://ripple.moe";
        this.api = bot.api.ripple;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.ripple;

        this.registerCommand([
            new NickCommand(this),
            new UserCommand(this),
            new TopCommand(this),
            new ChatCommand(this),
            new FindCommand(this),
            new RecentCommand(this),
            new ModeCommand(this),
        ]);
    }
}
