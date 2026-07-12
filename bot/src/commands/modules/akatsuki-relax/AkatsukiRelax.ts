import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { TopCommand } from "commands/modules/server/TopCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { UserCommand } from "commands/modules/server/UserCommand";
import { NickCommand } from "commands/modules/server/NickCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";

export class AkatsukiRelax extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["ax", "фч"], bot);

        this.name = "Akatsuki!Relax";
        this.link = "https://akatsuki.gg";
        this.api = bot.api.akatsukiRx;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.akatsuki;

        this.registerCommand([
            new UserCommand(this, true),
            new TopCommand(this, true),
            new RecentCommand(this),
            new NickCommand(this, bot.api.akatsuki, bot.storage.gameServers.akatsuki),
            new ModeCommand(this, bot.storage.gameServers.akatsuki),
        ]);
    }
}
