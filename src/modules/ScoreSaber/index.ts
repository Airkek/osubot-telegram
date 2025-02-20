import { Module } from '../../Module';
import { Bot } from '../../Bot';
import AbstractUser from '../BaseServerCommands/User';
import Nick from './Nick';
import Id from './Id';
import AbstractRecent from '../BaseServerCommands/Recent';
import AbstractTop from '../BaseServerCommands/Top';
import AbstractChat from '../BaseServerCommands/Chat';

export default class ScoreSaber extends Module {
    constructor(bot: Bot) {
        super(['ss', 'ыы'], bot);
        
        this.name = 'ScoreSaber';
        this.link = 'https://scoresaber.com';
        this.api = bot.api.scoresaber;
        this.db = bot.database.servers.scoresaber;

        this.registerCommand([
            new Nick(this),
            new Id(this),
            new AbstractUser(this),
            new AbstractRecent(this),
            new AbstractTop(this),
            new AbstractChat(this)
        ]);
    }
}