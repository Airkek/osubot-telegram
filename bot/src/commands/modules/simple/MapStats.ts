import { IPerformanceRequest } from "games/osu/performance/IPerformanceRequest";
import { Command } from "commands/Command";
import { SimpleCommandsModule } from "commands/modules/simple/SimpleCommandsModule";
import { Mods } from "games/osu/performance/Mods";

export class MapStats extends Command {
    constructor(module: SimpleCommandsModule) {
        super(["map"], module, async (ctx, self, args) => {
            const chat = module.bot.chatBeatmaps.getChat(ctx.chatId);
            if (!chat) {
                await ctx.reply(ctx.tr("send-beatmap-first"));
                return;
            }
            const mods = new Mods(args.mods);
            const map = await module.bot.osuBeatmapProvider.getBeatmapById(chat.map.id, chat.map.mode);
            await map.applyMods(mods);

            const hits = map.hitObjectsCount;
            const accuracy = args.acc / 100 || 1;
            const maxCombo = args.combo ? Math.min(map.maxCombo, Math.max(1, args.combo)) : map.maxCombo;
            const missCount = args.miss ? Math.min(hits, Math.max(0, args.miss)) : 0;

            const ppArgs: IPerformanceRequest = {
                acc: accuracy,
                combo: maxCombo,
                hits,
                miss: missCount,
                mods: new Mods(args.mods),
                counts: {
                    50: args.c50,
                },
            };

            const data = await this.module.bot.replies.beatmapPP(ctx, ctx, map, ppArgs);

            await ctx.reply(data.text, {
                photo: data.photo,
            });
        });
    }

    getSplittedText(text: string): string[] {
        return text.split(/\s+/).splice(1);
    }
}
