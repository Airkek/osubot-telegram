import { Module } from "../Module";
import { Bot } from "../../../Bot";
import ErrorCommand from "./Error";
import IgnoreCommand from "./Ignore";
import DropCommand from "./Drop";
import ClearChatsCommand from "./ClearChats";
import NotifyCommand from "./Notify";
import ListFeature from "./ListFeature";
import EnableFeature from "./EnableFeature";
import DisableFeature from "./DisableFeature";

export default class Admin extends Module {
    constructor(bot: Bot) {
        super(["admin", "фвьшт", "админ"], bot);

        this.name = "Admin";

        this.registerCommand([
            new ErrorCommand(this),
            new IgnoreCommand(this),
            new DropCommand(this),
            new ClearChatsCommand(this),
            new NotifyCommand(this),
            new ListFeature(this),
            new EnableFeature(this),
            new DisableFeature(this),
        ]);
    }
}
