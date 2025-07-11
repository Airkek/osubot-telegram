import { Command } from "../../Command";
import { SimpleCommandsModule } from "./index";
import Mods from "../../../osu_specific/pp/Mods";
import { InputFile } from "grammy";

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

            if (await ctx.preferCardsOutput()) {
                const photo = await module.bot.okiChanCards.generateBeatmapPPCard(map, ctx, args);

                const beatmapUrl = `https://osu.ppy.sh/b/${map.id}`;
                await ctx.reply(`${ctx.tr("score-beatmap-link")}: ${beatmapUrl}`, {
                    photo: new InputFile(photo),
                });
            } else {
                const cover = await module.bot.database.covers.getCover(map.setId);
                await ctx.reply(module.bot.templates.PP(ctx, map, args), {
                    photo: cover,
                });
            }
        });
    }

    getSplittedText(text: string): string[] {
        return text.split(/\s+/).splice(1);
    }
}
