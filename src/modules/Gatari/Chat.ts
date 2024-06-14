import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class GatariChat extends Command {
    constructor(module: Module) {
        super(["chat", "срфе"], module, async (ctx, self, args) => {
            if(ctx.isChat) {
                try {
                    let members = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
                    let users = [];
                    for(let i = 0; i < members.length; i++) {
                        let u = await self.module.bot.database.servers.gatari.getUserStats(members[i], args.mode || 0);
                        if(u.id && !users.some(uu => uu.id == u.id)) {
                            users.push(u);
                        }
                    }
                    users.filter(a => a.rank > 0 && a.pp > 0);
                    users.sort((a,b) => {
                        if(a.rank > b.rank)
                            return 1;
                        else if(a.rank < b.rank)
                            return -1;
                        else return 0;
                    });
                    ctx.reply(`[Server: ${self.module.name}]\nТоп${users.length > 15 ? '-15' : ''} беседы (ID ${ctx.chatId}):\n${users.splice(0, 15).map((user, i) => `#${i+1} ${user.nickname} ${self.module.bot.donaters.status("gatari", user.id)} | ${Util.round(user.pp, 1)}pp | Ранк ${user.rank} | ${Util.round(user.acc, 2)}%`).join("\n")}`);
                } catch(e) {
                    ctx.reply("Ошибка");
                }
            } else if(ctx.isFromUser) {
                if(!args.string[0])
                    return ctx.reply("Укажите ID беседы!");
                let id = parseInt(args.string[0]);
                if(isNaN(id))
                    return ctx.reply("Некорректный ID!");
                try {
                    let members = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
                    let users = [];
                    for(let i = 0; i < members.length; i++) {
                        let u = await self.module.bot.database.servers.gatari.getUserStats(members[i], args.mode || 0);
                        if(u.id && !users.some(uu => uu.id == u.id)) {
                            users.push(u);
                        }
                    }
                    users.filter(a => a.rank > 0 && a.pp > 0);
                    users.sort((a,b) => {
                        if(a.rank > b.rank)
                            return 1;
                        else if(a.rank < b.rank)
                            return -1;
                        else return 0;
                    });
                    ctx.reply(`[Server: ${self.module.name}]\nТоп беседы (ID ${id}):\n${users.map((user, i) => `#${i+1} ${user.nickname} ${self.module.bot.donaters.status("gatari", user.id)} | ${Util.round(user.pp, 1)}pp | Ранк ${user.rank} | ${Util.round(user.acc, 2)}%`).join("\n")}`);
                } catch(e) {
                    let err = await self.module.bot.database.errors.addError("g", ctx, String(e));
                    ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
                }
            }
        });
    }
}