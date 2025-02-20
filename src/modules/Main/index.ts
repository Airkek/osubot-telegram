import { Module } from '../../Module';
import { Bot } from '../../Bot';
import HelpCommand from './Help';
import UptimeCommand from './Uptime';
import TopCmdsCommand from './TopCmds';
import StatusCommand from './Status';
import SearchCommand from './Search';
import DisableCommand from './Disable';
import ClearCommand from './Clear';

export default class Main extends Module {
    constructor(bot: Bot) {
        super(['osu', 'осу', 'щыг'], bot);

        this.name = 'Main';

        this.registerCommand([
            new HelpCommand(this),
            new UptimeCommand(this),
            new TopCmdsCommand(this),
            new StatusCommand(this),
            new SearchCommand(this),
            new DisableCommand(this),
            new ClearCommand(this)
        ]);
    }
}