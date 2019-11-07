import Bot from "./Bot";
import { MessageContext } from "vk-io";
import { APIBeatmap, ICommandArgs } from "./Types";
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
        return this.chats.find(chat => chat.id == id);
    }

    setMap(id: number, map: APIBeatmap) {
        if(!this.getChat(id))
            return this.chats.push({
                id: id,
                map: map
            });
        let index = this.chats.findIndex(chat => chat.id == id);
        this.chats[index].map = map;
    }

    async sendMap(beatmapId: number, ctx: MessageContext) {
        let map = await this.bot.api.bancho.getBeatmap(beatmapId);
        let cover = await this.bot.database.covers.getCover(map.id.set);
        ctx.reply(this.bot.templates.Beatmap(map), {
            attachment: cover
        });
        this.setMap(ctx.peerId, map);
    }

    async stats(ctx: MessageContext) {
        let args = Util.parseArgs(ctx.text.split(" ").splice(1))
        let chat = this.getChat(ctx.peerId);
        if(!chat)
            return ctx.reply("Сначала отправьте карту!");
        let mods = new Mods(args.mods);
        let map = await this.bot.api.bancho.getBeatmap(chat.map.id.map, chat.map.mode, mods.diff());
        let cover = await this.bot.database.covers.getCover(map.id.set);
        ctx.reply(this.bot.templates.PP(map, args), {
            attachment: cover
        });
    }
}