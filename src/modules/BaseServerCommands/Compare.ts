import { Command } from "../../Command";
import { Module } from "../../Module";
import Mods from "../../pp/Mods";
import Calculator from '../../pp/bancho';
import Util from "../../Util";
import { IDatabaseUser } from "../../Types";

export default class AbstractCompare extends Command {
    constructor(module: Module) {
        super(["compare", "c", "с", "сщьзфку"], module, async (ctx, self, args) => {
            let userId: number = null;
            let dbUser: IDatabaseUser = undefined;
            if (args.nickname[0]) {
                userId = (await self.module.api.getUser(args.nickname.join(" "))).id;
            } else {
                if(ctx.hasReplyMessage) {
                    dbUser = await self.module.db.getUser(ctx.replyMessage.senderId);

                    if(!dbUser.nickname) {
                        return ctx.reply(`У этого пользователя не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }                    
                } else {
                    dbUser = await self.module.db.getUser(ctx.senderId);

                    if(!dbUser.nickname) {
                        return ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }
                }

                userId = dbUser.uid;
            }
            
            let mode = args.mode === null ? dbUser?.mode || 0 : args.mode;
            try {
                let chat = self.module.bot.maps.getChat(ctx.peerId);
                if(!chat)
                    return ctx.reply("Сначала отправьте карту!");
                let score = await self.module.api.getScoreByUid(userId, chat.map.id.map, mode, args.mods.length == 0 ? undefined : new Mods(args.mods).sum());
                let map = await self.module.bot.api.v2.getBeatmap(chat.map.id.map, mode, score.mods.diff());
                let cover = await self.module.bot.database.covers.getCover(map.id.set);
                let calc = new Calculator(map, score.mods);
                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.Compare(score, map, calc)}`, {
                    attachment: cover
                });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError(module.prefix[0], ctx, String(e));
                    ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}