import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractNick from "../BaseServerCommands/Nick";

export default class Akatsuki extends ServerModule {
    constructor(bot: Bot) {
        super(["a", "ф"], bot);

        this.name = "Akatsuki";
        this.link = "https://akatsuki.gg";
        this.api = bot.api.akatsuki;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.akatsuki;

        this.registerCommand([
            new AbstractNick(this),
            new AbstractUser(this),
            new AbstractTop(this),
            new AbstractChat(this),
            new AbstractFind(this),
            new AbstractRecent(this),
        ]);
    }
}
