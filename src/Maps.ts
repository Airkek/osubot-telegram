import { Bot } from "./Bot";
import UnifiedMessageContext from "./TelegramSupport";
import Util from "./Util";
import Mods from "./pp/Mods";
import { IBeatmap } from "./beatmaps/BeatmapTypes";

interface Chat {
    id: number;
    map: IBeatmap;
}

export default class Maps {
    bot: Bot;
    chats: Chat[];
    constructor(bot: Bot) {
        this.bot = bot;
        this.chats = [];
    }

    getChat(id: number): Chat {
        return this.chats.find((chat) => chat.id == id);
    }

    setMap(id: number, map: IBeatmap) {
        if (!this.getChat(id)) {
            this.chats.push({
                id,
                map,
            });
            return;
        }
        const index = this.chats.findIndex((chat) => chat.id == id);
        this.chats[index].map = map;
    }

    async sendMap(beatmapId: number, ctx: UnifiedMessageContext) {
        try {
            const map = await this.bot.osuBeatmapProvider.getBeatmapById(beatmapId);
            const cover = await this.bot.database.covers.getCover(map.setId);
            await ctx.reply(this.bot.templates.Beatmap(map), {
                attachment: cover,
            });
            this.setMap(ctx.peerId, map);
        } catch (e) {
            const err = await this.bot.database.errors.addError(ctx, e);
            await ctx.reply(`${Util.error(e.message)} (${err})`);
        }
    }

    async stats(ctx: UnifiedMessageContext) {
        const args = Util.parseArgs(ctx.text.split(" ").splice(1));
        const chat = this.getChat(ctx.peerId);
        if (!chat) {
            await ctx.reply("Сначала отправьте карту!");
            return;
        }
        const mods = new Mods(args.mods);
        const map = await this.bot.osuBeatmapProvider.getBeatmapById(chat.map.id, chat.map.mode);
        await map.applyMods(mods);
        const cover = await this.bot.database.covers.getCover(map.setId);
        await ctx.reply(this.bot.templates.PP(map, args), {
            attachment: cover,
        });
    }
}
