import { Command } from "../../Command";
import { Module } from "../../Module";

export default class SearchCommand extends Command {
    constructor(module: Module) {
        super(["search", "ыуфкср"], module, async (ctx, self, args) => {
            if (!args.full[0]) {
                await ctx.reply("Укажите запрос для поиска");
                return;
            }

            const data = await self.module.bot.api.v2.getBeatmapsets({
                query: args.full.join(" "),
                status: "ranked",
            });

            if (!data.length) {
                await ctx.reply("Не найдено карт");
            }

            await ctx.reply(`Результат поиска:\n\n${self.module.bot.templates.Search(data.splice(0, 10))}`, {
                dont_parse_links: 1,
            });
        });
    }
}
