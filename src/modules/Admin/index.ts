import { Module } from '../../Module';
import { Bot } from "../../Bot";
import NewsCommand from './News';
import ErrorCommand from './Error';
import StatusCommand from './Status';
import IgnoreCommand from './Ignore';

export default class Admin extends Module {
    constructor(bot: Bot) {
        super(["admin", "фвьшт", "админ"], bot);

        this.name = "Admin";

        this.registerCommand([
            new NewsCommand(this),
            new ErrorCommand(this),
            new StatusCommand(this),
            new IgnoreCommand(this)
        ]);
    }
}