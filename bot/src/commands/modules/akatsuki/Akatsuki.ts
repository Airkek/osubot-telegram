import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";
import { FindCommand } from "commands/modules/server/FindCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { NickCommand } from "commands/modules/server/NickCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";

export class Akatsuki extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["a", "ф"], bot);

        this.name = "Akatsuki";
        this.link = "https://akatsuki.gg";
        this.api = bot.api.akatsuki;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.akatsuki;

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
