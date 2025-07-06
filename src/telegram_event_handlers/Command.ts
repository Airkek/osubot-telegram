import { Module } from "./modules/Module";
import Util from "../Util";
import UnifiedMessageContext from "../TelegramSupport";

export interface ICommandArgs {
    full: string[];
    fullString: string;
    nickname: string[];
    mods: string;
    combo: number;
    acc: number;
    miss: number;
    place: number;
    apx: number;
    page: number;
    graphicmode: number;
    more: number;
    c50: number;
    mode?: number;
}

export class Command {
    readonly name: string;
    readonly prefixes: string[];
    readonly module: Module;
    uses: number;
    function: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void>;

    permission: (ctx: UnifiedMessageContext) => boolean;
    constructor(
        prefixes: string[],
        module: Module,
        func: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void>
    ) {
        this.name = prefixes[0];
        this.prefixes = prefixes;
        this.module = module;
        this.function = func;

        this.uses = 0;
        this.permission = () => true;
    }

    public async process(ctx: UnifiedMessageContext) {
        if (!this.permission(ctx)) {
            return;
        }
        const timer = Util.timer();
        this.uses++;

        try {
            let text = "";
            if (ctx.messagePayload) {
                text = ctx.messagePayload;
            } else if (ctx.text) {
                text = ctx.text;
            }
            await this.function(ctx, this, this.parseArgs(this.getSplittedText(text)));
        } catch (e: unknown) {
            const err = await this.module.bot.database.errors.addError(ctx, e);

            let errorText: string;
            if (e instanceof Error) {
                errorText = e.message;
            } else if (e instanceof String) {
                errorText = String(e);
            }

            await ctx.reply(`${Util.error(errorText, ctx)} (${err})`);
        }

        await this.module.bot.database.statsModel.logCommand(this, ctx);
        global.logger.trace(`[${this.module.name}::${this.name}] command processing took ${timer.ms}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public check(name: string, ctx: UnifiedMessageContext) {
        return this.prefixes.includes(name.toLowerCase());
    }

    getSplittedText(text: string): string[] {
        const command = text.split(/\s+/).slice(0, 2).join(" ");
        return text.replace(command, " ").trim().split(" ");
    }

    private parseArgs(args: string[]): ICommandArgs {
        const iArg: ICommandArgs = {
            full: args,
            fullString: args.join(" "),
            nickname: [],
            mods: "",
            combo: 0,
            miss: 0,
            acc: 0,
            place: 0,
            apx: 0,
            more: 0,
            c50: 0,
            page: 1,
            graphicmode: -1,
            mode: null,
        };

        for (let i = args.length - 1; i > -1; i--) {
            const arg = args[i].toLowerCase();
            if (arg == "-std" || arg == "-osu" || arg == "-s" || arg == "-o") {
                iArg.mode = 0;
            } else if (arg == "-taiko" || arg == "-drums" || arg == "-t") {
                iArg.mode = 1;
            } else if (arg == "-fruits" || arg == "-ctb" || arg == "-c" || arg == "-catch") {
                iArg.mode = 2;
            } else if (arg == "-mania" || arg == "-m") {
                iArg.mode = 3;
            } else if (arg.startsWith("^p")) {
                iArg.page = Math.max(Number(arg.slice(2)), 1);
            } else if (arg.startsWith("^g")) {
                iArg.graphicmode = Math.max(Number(arg.slice(2)), 1);
            } else if (arg.startsWith("+")) {
                iArg.mods = arg.slice(1);
            } else if (arg.endsWith("x")) {
                iArg.combo = Number(arg.slice(0, -1));
                iArg.nickname.push(arg);
            } else if (arg.endsWith("x50")) {
                iArg.c50 = Math.max(Number(arg.slice(0, -3)), 0);
                iArg.nickname.push(arg);
            } else if (arg.endsWith("m")) {
                iArg.miss = Number(arg.slice(0, -1));
                iArg.nickname.push(arg);
            } else if (arg.endsWith("%")) {
                iArg.acc = Number(arg.slice(0, -1));
            } else if (arg.startsWith("\\")) {
                iArg.place = Number(arg.slice(1));
            } else if (arg.startsWith("~")) {
                iArg.apx = Math.max(Number(arg.slice(1)), 1);
            } else if (arg.startsWith(">")) {
                iArg.more = Math.max(Number(arg.slice(1)), 1);
            } else {
                iArg.nickname.push(arg);
            }
        }
        iArg.nickname.reverse();

        return iArg;
    }
}
