import { ServerModule } from "../Module";
import { Bot } from "../../../Bot";
import AbstractUser from "../BaseServerCommands/User";
import AbstractTop from "../BaseServerCommands/Top";
import AbstractRecent from "../BaseServerCommands/Recent";
import AbstractNick from "../BaseServerCommands/Nick";
import AbstractMode from "../BaseServerCommands/Mode";

export default class RippleRelax extends ServerModule {
    constructor(bot: Bot) {
        super(["rx", "кч"], bot);

        this.name = "Ripple!Relax";
        this.link = "https://ripple.moe";
        this.api = bot.api.rippleRx;
        this.beatmapProvider = bot.osuBeatmapProvider;
        this.db = bot.database.servers.ripple;

        this.registerCommand([
            new AbstractUser(this, true),
            new AbstractTop(this, true),
            new AbstractRecent(this),
            new AbstractNick(this, bot.api.ripple, bot.database.servers.ripple),
            new AbstractMode(this, bot.database.servers.ripple),
        ]);
    }
}
