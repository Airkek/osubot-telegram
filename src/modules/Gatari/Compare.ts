import { Command } from "../../Command";
import { Module } from "../../Module";
import Calculator from "../../pp/bancho";
import Util from "../../Util";

export default class GatariCompare extends Command {
    constructor(module: Module) {
        super(["compare", "c", "с", "сщьзфку"], module, async (ctx, self, args) => {
            let dbUser = await self.module.bot.database.servers.gatari.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.gatari.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.bot.database.servers.gatari.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            if(!dbUser.nickname)
                return ctx.reply("Не указан ник!");
            let mode = args.mode === null ? dbUser.mode || 0 : args.mode;
            try {
                let chat = self.module.bot.maps.getChat(ctx.peerId);
                if(!chat)
                    return ctx.reply("Отправьте карту!");
                let score = await self.module.bot.api.gatari.getScore(dbUser.nickname, chat.map.id.map, mode);
                let map = await self.module.bot.api.bancho.getBeatmap(chat.map.id.map, mode, score.mods.diff());
                let cover = await self.module.bot.database.covers.getCover(map.id.set);
                let calc = new Calculator(map, score.mods);
                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.Compare(score, map, calc)}`, {
                    attachment: cover
                });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError("g", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}