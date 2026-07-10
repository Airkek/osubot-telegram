import { Command } from "../../Command";
import { IMessageContext } from "../../../core/MessageContext";
import { SimpleCommandsModule } from "./index";
import { getMapIdFromLink } from "../../../osu_specific/regexes/MapRegexp";

export class MapLink extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map_link"], module, async (ctx: IMessageContext) => {
            const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(mapId);
            const data = await module.bot.replyUtils.beatmapInfo(ctx, ctx, map);
            await ctx.reply(data.text, {
                photo: data.photo,
            });
            module.bot.maps.setMap(ctx.chatId, map);
        });
    }

    check(name: string, ctx: IMessageContext): boolean {
        const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
        return !!mapId;
    }

    private getMapFromAttachments(ctx: IMessageContext): number | null {
        return ctx.hasLinks() ? getMapIdFromLink(ctx.getLinks()[0].url) : null;
    }
}
