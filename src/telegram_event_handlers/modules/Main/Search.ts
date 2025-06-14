import { Command } from "../../Command";
import { Module } from "../Module";

export default class SearchCommand extends Command {
    constructor(module: Module) {
        super(["search", "ыуфкср"], module, async (ctx, self, args) => {
            if (!args.full[0]) {
                await ctx.reply(ctx.tr("search-not-specified"));
                return;
            }

            const data = await self.module.bot.banchoApi.getBeatmapsets({
                query: args.full.join(" "),
                status: "ranked",
            });

            if (!data.length) {
                await ctx.reply(ctx.tr("search-not-found"));
            }

            await ctx.reply(
                `${ctx.tr("search-result-header")}\n\n${self.module.bot.templates.Search(data.splice(0, 10))}`
            );
        });
    }
}
