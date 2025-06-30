import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractUser from "../BaseServerCommands/User";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractMode from "../BaseServerCommands/Mode";

export default class AkatsukiAutoPilot extends ServerModule {
    constructor(bot: Bot) {
        super(["ap", "фз"], bot);

        this.name = "Akatsuki!AutoPilot";
        this.link = "https://akatsuki.gg";
        this.api = bot.api.akatsukiAp;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.akatsuki;

        this.registerCommand([
            new AbstractUser(this, true),
            new AbstractTop(this, true),
            new AbstractRecent(this),
            new AbstractNick(this, bot.api.akatsuki, bot.database.servers.akatsuki),
            new AbstractMode(this, bot.database.servers.akatsuki),
        ]);
    }
}
