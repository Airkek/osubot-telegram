import { Bot } from "./Bot";
import UnifiedMessageContext from "./TelegramSupport";
import { APIBeatmap } from "./Types";
import Util from "./Util";
import Mods from "./pp/Mods";

interface Chat {
    id: number;
    map: APIBeatmap;
}

export default class Maps {
    bot: Bot;
    chats: Chat[];
    constructor(bot: Bot) {
        this.bot = bot;
        this.chats = [];
    }

    getChat(id: number): Chat {
        this.chats.find((chat) => chat.id == id);
        return;
    }

    setMap(id: number, map: APIBeatmap) {
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
            const map = await this.bot.api.v2.getBeatmap(beatmapId);
            const cover = await this.bot.database.covers.getCover(map.id.set);
            await ctx.reply(this.bot.templates.Beatmap(map), {
                attachment: cover,
            });
            this.setMap(ctx.peerId, map);
        } catch (e) {
            const err = await this.bot.database.errors.addError(
                "b",
                ctx,
                String(e)
            );
            await ctx.reply(`${Util.error(String(e))} (${err})`);
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
        const map = await this.bot.api.v2.getBeatmap(
            chat.map.id.map,
            chat.map.mode,
            mods
        );
        const cover = await this.bot.database.covers.getCover(map.id.set);
        await ctx.reply(this.bot.templates.PP(map, args), {
            attachment: cover,
        });
    }
}
