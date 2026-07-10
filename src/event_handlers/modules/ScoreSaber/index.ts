import { ServerModule } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import AbstractUser from "../BaseServerCommands/User";
import UseIdInsteadOfNick from "../BaseServerCommands/UseIdInsteadOfNick";
import Id from "../BaseServerCommands/Id";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractChat from "../BaseServerCommands/Chat";

export default class ScoreSaber extends ServerModule {
    constructor(bot: BotRuntime) {
        super(["ss", "ыы"], bot);

        this.name = "ScoreSaber";
        this.link = "https://scoresaber.com";
        this.api = bot.api.scoresaber;
        this.db = bot.storage.gameServers.scoresaber;

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
