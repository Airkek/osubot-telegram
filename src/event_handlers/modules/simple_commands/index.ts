import { Module } from "../Module";
import { BotRuntime } from "../../../core/BotRuntime";
import { MapLink } from "./MapLink";
import { MapStats } from "./MapStats";
import { BanchoScore } from "./BanchoScore";
import { OsuReplay } from "./OsuReplay";

export class SimpleCommandsModule extends Module {
    constructor(bot: BotRuntime) {
        super([], bot);

        this.name = "Simple";

        this.registerCommand([new MapLink(this), new MapStats(this), new BanchoScore(this), new OsuReplay(this)]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    checkPrefix(args: string[]): boolean {
        return true;
    }
}
