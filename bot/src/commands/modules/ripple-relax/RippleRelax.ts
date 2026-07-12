import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { NickCommand } from "commands/modules/server/NickCommand";
import { ModeCommand } from "commands/modules/server/ModeCommand";

export class RippleRelax extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["rx", "кч"], bot);

        this.name = "Ripple!Relax";
        this.link = "https://ripple.moe";
        this.api = bot.api.rippleRx;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.storage.gameServers.ripple;

        this.registerCommand([
            new UserCommand(this, true),
            new TopCommand(this, true),
            new RecentCommand(this),
            new NickCommand(this, bot.api.ripple, bot.storage.gameServers.ripple),
            new ModeCommand(this, bot.storage.gameServers.ripple),
        ]);
    }
}
