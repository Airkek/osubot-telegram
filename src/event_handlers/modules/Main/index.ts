import { Module } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import HelpCommand from "./Help";
import TopCmdsCommand from "./TopCmds";
import StatusCommand from "./Status";
import SearchCommand from "./Search";
import ClearCommand from "./Clear";
import SettingsCommand from "./Settings";
import OnboardingCommand from "./Onboarding";
import AccountCommand from "./Account";

export default class Main extends Module {
    constructor(bot: BotRuntime) {
        super(["osu", "осу", "щыг"], bot);

        this.name = "Main";

        this.registerCommand([
            new HelpCommand(this),
            new TopCmdsCommand(this),
            new StatusCommand(this),
            new SearchCommand(this),
            new ClearCommand(this),
            new SettingsCommand(this),
            new OnboardingCommand(this),
            new AccountCommand(this),
        ]);
    }
}
