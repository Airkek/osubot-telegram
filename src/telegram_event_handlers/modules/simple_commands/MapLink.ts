import { Command } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { SimpleCommandsModule } from "./index";
import { getMapIdFromLink } from "../../../osu_specific/regexes/MapRegexp";
import { InputFile } from "grammy";

export class MapLink extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map_link"], module, async (ctx: UnifiedMessageContext) => {
            const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(mapId);
            if (await ctx.preferCardsOutput()) {
                const mapImg = await module.bot.okiChanCards.generateBeatmapPPCard(map, ctx);
                const beatmapUrl = `https://osu.ppy.sh/b/${map.id}`;
                await ctx.reply(`${ctx.tr("score-beatmap-link")}: ${beatmapUrl}`, {
                    photo: new InputFile(mapImg),
                });
            } else {
                const cover = await module.bot.database.covers.getCover(map.setId);
                await ctx.reply(module.bot.templates.Beatmap(ctx, map), {
                    photo: cover,
                });
            }
            module.bot.maps.setMap(ctx.chatId, map);
        });
    }

    check(name: string, ctx: UnifiedMessageContext): boolean {
        const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
        return !!mapId;
    }

    private getMapFromAttachments(ctx: UnifiedMessageContext): number | null {
        return ctx.hasLinks() ? getMapIdFromLink(ctx.getLinks()[0].url) : null;
    }
}
