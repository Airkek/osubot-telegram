import { IMessageContext } from "core/IMessageContext";
import { Command } from "commands/Command";
import { SimpleCommandsModule } from "commands/modules/simple/SimpleCommandsModule";
import { getMapIdFromLink } from "games/osu/parsing/MapRegexp";

export class MapLink extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map_link"], module, async (ctx: IMessageContext) => {
            const mapId = getMapIdFromLink(ctx.text) || this.getMapFromAttachments(ctx);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(mapId);
            const data = await module.bot.replies.beatmapInfo(ctx, ctx, map);
            await ctx.reply(data.text, {
                photo: data.photo,
            });
            module.bot.chatBeatmaps.setMap(ctx.chatId, map);
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
