import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractUser from "../BaseServerCommands/User";

export default class AkatsukiRelax extends ServerModule {
    constructor(bot: Bot) {
        super(["ax", "фч"], bot);

        this.name = "Akatsuki!Relax";
        this.link = "https://akatsuki.gg";
        this.api = bot.api.relax;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.akatsuki;

        this.registerCommand([new AbstractUser(this, true), new AbstractTop(this, true), new AbstractRecent(this)]);
    }
}
