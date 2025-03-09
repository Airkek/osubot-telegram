import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import Nick from "./Nick";
import Id from "./Id";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractChat from "../BaseServerCommands/Chat";

export default class BeatLeader extends ServerModule {
    constructor(bot: Bot) {
        super(["bl", "ид"], bot);

        this.name = "BeatLeader";
        this.link = "https://beatleader.xyz";
        this.api = bot.api.beatleader;
        this.db = bot.database.servers.beatleader;

        this.registerCommand([
            new Nick(this),
            new Id(this),
            new AbstractUser(this),
            new AbstractRecent(this),
            new AbstractTop(this),
            new AbstractChat(this),
        ]);
    }
}
