import { Module } from "commands/Module";
import { IBotRuntime } from "core/IBotRuntime";
import { HelpCommand } from "commands/modules/main/HelpCommand";
import { TopCmdsCommand } from "commands/modules/main/TopCmdsCommand";
import { StatusCommand } from "commands/modules/main/StatusCommand";
import { SearchCommand } from "commands/modules/main/SearchCommand";
import { ClearCommand } from "commands/modules/main/ClearCommand";
import { SettingsCommand } from "commands/modules/main/SettingsCommand";
import { OnboardingCommand } from "commands/modules/main/OnboardingCommand";
import { AccountCommand } from "commands/modules/main/AccountCommand";

export class Main extends Module {
    constructor(bot: IBotRuntime) {
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
