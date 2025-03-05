import { Module } from "./Module";
import Util from "./Util";
import { ICommandArgs } from "./Types";
import UnifiedMessageContext from "./TelegramSupport";

export class Command {
    readonly name: string | string[];
    module: Module;
    disables: boolean = true;
    uses: number;
    function: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void>;

    permission: (ctx: UnifiedMessageContext) => boolean;
    constructor(
        name: string | string[],
        module: Module,
        func: (ctx: UnifiedMessageContext, self: Command, args: ICommandArgs) => Promise<void>
    ) {
        this.name = name;
        this.module = module;
        this.function = func;

        this.uses = 0;
        this.permission = () => true;
    }

    public async process(ctx: UnifiedMessageContext) {
        if (!this.permission(ctx)) {
            return;
        }
        this.uses++;
        if (ctx.hasMessagePayload) {
            await this.function(ctx, this, Util.parseArgs(ctx.messagePayload.split(" ").slice(2)));
        } else {
            await this.function(ctx, this, Util.parseArgs(ctx.text.split(" ").slice(2)));
        }
    }

    public check(name: string) {
        if (Array.isArray(this.name)) {
            return this.name.includes(name.toLowerCase());
        }
        return this.name == name.toLowerCase();
    }
}
