import { Command } from "../../Command";
import { Module } from "../Module";

export default class TopCmdsCommand extends Command {
    constructor(module: Module) {
        super(["topcmds", "ещзсьвы"], module, async (ctx) => {
            await ctx.reply(`${ctx.tr("bot_grafana_link")}: ${process.env.GRAFANA_LINK}`);
        });
    }
}
