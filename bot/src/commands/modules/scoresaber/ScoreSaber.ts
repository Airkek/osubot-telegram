import { ServerModule } from "commands/ServerModule";
import { IBotRuntime } from "core/IBotRuntime";
import { UserCommand } from "commands/modules/server/UserCommand";
import { UseIdInsteadOfNickCommand } from "commands/modules/server/UseIdInsteadOfNickCommand";
import { IdCommand } from "commands/modules/server/IdCommand";
import { RecentCommand } from "commands/modules/server/RecentCommand";
import { TopCommand } from "commands/modules/server/TopCommand";
import { ChatCommand } from "commands/modules/server/ChatCommand";

export class ScoreSaber extends ServerModule {
    constructor(bot: IBotRuntime) {
        super(["ss", "ыы"], bot);

        this.name = "ScoreSaber";
        this.link = "https://scoresaber.com";
        this.api = bot.api.scoresaber;
        this.db = bot.storage.gameServers.scoresaber;

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
