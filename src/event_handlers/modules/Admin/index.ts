import { Module } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import ErrorCommand from "./Error";
import IgnoreCommand from "./Ignore";
import DropCommand from "./Drop";
import ClearCommand from "./Clear";
import NotifyCommand from "./Notify";
import ListFeature from "./ListFeature";
import EnableFeature from "./EnableFeature";
import DisableFeature from "./DisableFeature";

export default class Admin extends Module {
    constructor(bot: BotRuntime) {
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
