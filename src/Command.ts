import { Module } from "./Module";
import Util from "./Util";
import { ICommandArgs } from "./Types";
import UnifiedMessageContext from "./TelegramSupport";

export class Command {
    readonly name: string;
    readonly prefixes: string[];
    readonly module: Module;
    readonly disables: boolean = true;
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
        if (ctx.hasMessagePayload) {
            await this.function(ctx, this, Util.parseArgs(ctx.messagePayload.split(" ").slice(2)));
        } else {
            await this.function(ctx, this, Util.parseArgs(ctx.text.split(" ").slice(2)));
        }

        global.logger.trace(`[${this.module.name}::${this.name}] command processing took ${timer.ms}`);
    }

    public check(name: string) {
        return this.prefixes.includes(name.toLowerCase());
    }
}
