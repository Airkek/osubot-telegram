import { Command } from "../../Command";
import { SimpleCommandsModule } from "./index";
import Mods from "../../../osu_specific/pp/Mods";

export class MapStats extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map"], module, async (ctx, self, args) => {
            const chat = module.bot.maps.getChat(ctx.chatId);
            if (!chat) {
                await ctx.reply(ctx.tr("send-beatmap-first"));
                return;
            }
            const mods = new Mods(args.mods);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(chat.map.id, chat.map.mode);
            await map.applyMods(mods);
            const cover = await module.bot.database.covers.getCover(map.setId);
            await ctx.reply(module.bot.templates.PP(ctx, map, args), {
                photo: cover,
            });
        });
    }

    getSplittedText(text: string): string[] {
        return text.split(/\s+/).splice(1);
    }
}
