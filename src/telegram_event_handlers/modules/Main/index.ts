import { Module } from "../Module";
import { Bot } from "../../../Bot";
import HelpCommand from "./Help";
import TopCmdsCommand from "./TopCmds";
import StatusCommand from "./Status";
import SearchCommand from "./Search";
import ClearCommand from "./Clear";
import SettingsCommand from "./Settings";
import OnboardingCommand from "./Onboarding";

export default class Main extends Module {
    constructor(bot: Bot) {
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
        ]);
    }
}
