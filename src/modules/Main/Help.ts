import { Command } from "../../Command";
import { Module } from "../../Module";

export default class HelpCommand extends Command {
    constructor(module: Module) {
        super(["help", "хелп", "рудз", "помощь"], module, (ctx, self, args) => {
            ctx.reply("https://telegra.ph/Pomoshch-osu-bota-06-14", {
                dont_parse_links: false
            });
        });
    }
}
