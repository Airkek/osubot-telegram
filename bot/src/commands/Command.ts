import { IMessageContext } from "core/IMessageContext";
import { Module } from "commands/Module";
import { Util } from "shared/Util";
import { localizeError } from "core/errors/localizeError";
import { ICommandArgs } from "commands/ICommandArgs";

export class Command {
    readonly name: string;
    readonly prefixes: string[];
    readonly module: Module;
    function: (ctx: IMessageContext, self: Command, args: ICommandArgs) => Promise<void>;

    permission: (ctx: IMessageContext) => boolean;
    constructor(
        prefixes: string[],
        module: Module,
        func: (ctx: IMessageContext, self: Command, args: ICommandArgs) => Promise<void>
    ) {
        this.name = prefixes[0];
        this.prefixes = prefixes;
        this.module = module;
        this.function = func;
        this.permission = () => true;
    }

    public async process(ctx: IMessageContext) {
        if (!this.permission(ctx)) {
            return;
        }
        await ctx.activateLocalizer();
        const timer = Util.timer();

        try {
            let text = "";
            if (ctx.messagePayload) {
                text = ctx.messagePayload;
            } else if (ctx.text) {
                text = ctx.text;
            }
            await this.function(ctx, this, this.parseArgs(this.getSplittedText(text)));
        } catch (e: unknown) {
            let errorId: string;
            try {
                errorId = await this.module.bot.storage.errors.addError(ctx, e);
            } catch (recordError) {
                global.logger.error("Failed to record command error", recordError, e);
            }

            try {
                const errorReference = errorId ? ` (${errorId})` : "";
                await ctx.reply(`${localizeError(e, ctx)}${errorReference}`);
            } catch (replyError) {
                global.logger.error("Failed to send command error response", replyError);
            }
        }

        await this.module.bot.storage.telemetry.logCommand(this, ctx);
        const platform = ctx.platform === "vk" ? "VK" : "Telegram";
        global.logger.trace(`[${platform}][${this.module.name}::${this.name}] command processing took ${timer.ms}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public check(name: string, ctx: IMessageContext) {
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
