import { Module } from '../../Module';
import { Bot } from '../../Bot';
import ErrorCommand from './Error';
import IgnoreCommand from './Ignore';
import DropCommand from './Drop';

export default class Admin extends Module {
    constructor(bot: Bot) {
        super(['admin', 'фвьшт', 'админ'], bot);

        this.name = 'Admin';

        this.registerCommand([
            new ErrorCommand(this),
            new IgnoreCommand(this),
            new DropCommand(this)
        ]);
    }
}