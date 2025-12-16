import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractChat from "../BaseServerCommands/Chat";
import AbstractFind from "../BaseServerCommands/Find";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractMode from "../BaseServerCommands/Mode";

export default class Ripple extends ServerModule {
    constructor(bot: Bot) {
        super(["r", "к"], bot);

        this.name = "Ripple";
        this.link = "https://ripple.moe";
        this.api = bot.api.ripple;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.ripple;

        this.registerCommand([
            new AbstractNick(this),
            new AbstractUser(this),
            new AbstractTop(this),
            new AbstractChat(this),
            new AbstractFind(this),
            new AbstractRecent(this),
            new AbstractMode(this),
        ]);
    }
}
