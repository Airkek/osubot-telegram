import { Module } from "commands/Module";
import { IBotRuntime } from "core/IBotRuntime";
import { MapLink } from "commands/modules/simple/MapLink";
import { MapStats } from "commands/modules/simple/MapStats";
import { BanchoScore } from "commands/modules/simple/BanchoScore";
import { OsuReplay } from "commands/modules/simple/OsuReplay";

export class SimpleCommandsModule extends Module {
    constructor(bot: IBotRuntime) {
        super([], bot);

        this.name = "Simple";

        this.registerCommand([new MapLink(this), new MapStats(this), new BanchoScore(this), new OsuReplay(this)]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    checkPrefix(args: string[]): boolean {
        return true;
    }
}
