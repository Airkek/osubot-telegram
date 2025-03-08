import { Command } from "./Command";
import { Bot } from "./Bot";
import { IAPI } from "./API";
import { IDatabaseServer } from "./Types";
import UnifiedMessageContext from "./TelegramSupport";
import { IBeatmapProvider } from "./beatmaps/IBeatmapProvider";

interface ICommandsModule {
    name: string;
    prefix: string | string[];
    commands: Command[];
    bot: Bot;
}

export class Module implements ICommandsModule {
    name: string;
    link?: string;
    prefix: string[];
    commands: Command[];
    bot: Bot;
    api?: IAPI;
    beatmapProvider?: IBeatmapProvider;
    db?: IDatabaseServer;

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
        const args = ctx.hasMessagePayload ? ctx.messagePayload.split(" ") : ctx.text.split(" ");
        let map: number;
        if (args[0].startsWith("{map")) {
            map = Number(args[0].split("}")[0].slice(4));
            args[0] = args[0].split("}")[1];
        }
        if (args.length < 2) {
            return null;
        }
        const prefix = args.shift();
        const command = args.shift();
        if (!this.checkPrefix(prefix.toLowerCase()) || !this.findCommand(command)) {
            return null;
        }
        return {
            command: this.findCommand(command),
            map,
        };
    }

    checkPrefix(prefix: string): boolean {
        if (Array.isArray(this.prefix)) {
            return this.prefix.includes(prefix);
        }
        return this.prefix == prefix;
    }

    findCommand(command: string): Command | null {
        return this.commands.find((cmd) => cmd.check(command)) || null;
    }
}
