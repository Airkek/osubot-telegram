import { Module } from '../../Module';
import { Bot } from "../../Bot";
import NewsCommand from './News';
import EvalCommand from './Eval';
import ErrorCommand from './Error';
import StatusCommand from './Status';
import UploadCommand from './Upload';
import DownloadCommand from './Download';
import AdminVKScript from './VKScript';
import IgnoreCommand from './Ignore';

export default class Admin extends Module {
    constructor(bot: Bot) {
        super(["admin", "фвьшт", "админ"], bot);

        this.name = "Admin";

        this.registerCommand([
            new NewsCommand(this),
            new ErrorCommand(this),
            new StatusCommand(this),
            new EvalCommand(this),
            new UploadCommand(this),
            new DownloadCommand(this),
            new AdminVKScript(this),
            new IgnoreCommand(this)
        ]);
    }
}