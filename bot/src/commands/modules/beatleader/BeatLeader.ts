import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { UseIdInsteadOfNickCommand } from "commands/modules/server/UseIdInsteadOfNickCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";
import { IdCommand } from "commands/modules/server/IdCommand";

export class BeatLeader extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["bl", "ид"], bot);

        this.name = "BeatLeader";
        this.link = "https://beatleader.xyz";
        this.api = bot.api.beatleader;
        this.db = bot.storage.gameServers.beatleader;

        this.registerCommand([
            new UseIdInsteadOfNickCommand(this),
            new IdCommand(this),
            new UserCommand(this),
            new RecentCommand(this),
            new TopCommand(this),
            new ChatCommand(this),
        ]);
    }
}
