import { Command } from "../Command";
import { Bot } from "../../Bot";
import IAPI from "../../api/base";
import { IDatabaseServer } from "../../Types";
import UnifiedMessageContext from "../../TelegramSupport";
import { IBeatmapProvider } from "../../beatmaps/IBeatmapProvider";

export interface ICommandsModule {
    name: string;
    prefix: string | string[];
    commands: Command[];
    bot: Bot;
}

export class Module implements ICommandsModule {
    name: string;
    prefix: string[];
    commands: Command[];
    bot: Bot;

    constructor(prefix: string[], bot: Bot) {
        this.prefix = prefix;
        this.bot = bot;
        this.commands = [];
    }

    registerCommand(command: Command | Command[]) {
        if (Array.isArray(command)) {
            this.commands.push(...command);
        } else {
            this.commands.push(command);
        }
    }

    checkContext(ctx: UnifiedMessageContext): {
        command: Command;
        map?: number;
    } {
        let text = "";
        if (ctx.messagePayload) {
            text = ctx.messagePayload;
        } else if (ctx.text) {
            text = ctx.text;
        }
        const args = text.split(/\s+/);
        let map: number;
        if (args.length > 1 && args[0].startsWith("{map")) {
            map = Number(args[0].split("}")[0].slice(4));
            args[0] = args[0].split("}")[1];
        }
        if (!this.checkPrefix(args)) {
            return null;
        }

        const command = this.findCommand(args, ctx);
        if (!command) {
            return null;
        }
        return {
            command,
            map,
        };
    }

    checkPrefix(args: string[]): boolean {
        if (args.length < 1) {
            return null;
        }
        const prefix = args.shift().toLowerCase();
        return this.prefix.includes(prefix);
    }

    findCommand(args: string[], ctx: UnifiedMessageContext): Command | null {
        let command = "";
        if (args.length >= 1) {
            command = args.shift().toLowerCase();
        }
        return this.commands.find((cmd) => cmd.check(command, ctx)) || null;
    }
}

export class ServerModule extends Module {
    link: string;
    api: IAPI;
    db: IDatabaseServer;
    beatmapProvider?: IBeatmapProvider;
}
