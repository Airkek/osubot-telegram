import { Command } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { SimpleCommandsModule } from "./index";
import { getMapIdFromLink } from "../../../osu_specific/regexes/MapRegexp";

export class MapLink extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map_link"], module, async (ctx: UnifiedMessageContext) => {
            const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(mapId);
            const cover = await module.bot.database.covers.getCover(map.setId);
            await ctx.reply(module.bot.templates.Beatmap(ctx, map), {
                photo: cover,
            });
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
