import { ServerModule } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import AbstractUser from "../BaseServerCommands/User";
import UseIdInsteadOfNick from "../BaseServerCommands/UseIdInsteadOfNick";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractChat from "../BaseServerCommands/Chat";
import Id from "../BaseServerCommands/Id";

export default class BeatLeader extends ServerModule {
    constructor(bot: BotRuntime) {
        super(["bl", "ид"], bot);

        this.name = "BeatLeader";
        this.link = "https://beatleader.xyz";
        this.api = bot.api.beatleader;
        this.db = bot.storage.gameServers.beatleader;

        this.registerCommand([
            new UseIdInsteadOfNick(this),
            new Id(this),
            new AbstractUser(this),
            new AbstractRecent(this),
            new AbstractTop(this),
            new AbstractChat(this),
        ]);
    }
}
