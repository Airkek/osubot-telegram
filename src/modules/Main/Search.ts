import { Command } from "../../Command";
import { Module } from "../../Module";

export default class SearchCommand extends Command {
    constructor(module: Module) {
        super(["search", "ыуфкср"], module, async (ctx, self, args) => {
            if(!args.full[0])
                return ctx.reply("Укажите запрос для поиска");
            
            let data = await self.module.api.getBeatmapsets({ query: args.full.join(" "), status: 'ranked' });
            
            if(!data.length)
                return ctx.reply("Не найдено карт");

            ctx.reply("Результат поиска:\n\n" + self.module.bot.templates.Search(data.splice(0, 10)), { dont_parse_links: 1 });
        });
    }
}