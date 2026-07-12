import { Module } from "commands/Module";
import { IBotRuntime } from "core/IBotRuntime";
import { ErrorCommand } from "commands/modules/admin/ErrorCommand";
import { IgnoreCommand } from "commands/modules/admin/IgnoreCommand";
import { DropCommand } from "commands/modules/admin/DropCommand";
import { ClearCommand } from "commands/modules/admin/ClearCommand";
import { NotifyCommand } from "commands/modules/admin/NotifyCommand";
import { ListFeature } from "commands/modules/admin/ListFeature";
import { EnableFeature } from "commands/modules/admin/EnableFeature";
import { DisableFeature } from "commands/modules/admin/DisableFeature";

export class Admin extends Module {
    constructor(bot: IBotRuntime) {
        super(["admin", "фвьшт", "админ"], bot);

        this.name = "Admin";

        this.registerCommand([
            new ErrorCommand(this),
            new IgnoreCommand(this),
            new DropCommand(this),
            new ClearCommand(this),
            new NotifyCommand(this),
            new ListFeature(this),
            new EnableFeature(this),
            new DisableFeature(this),
        ]);
    }
}
