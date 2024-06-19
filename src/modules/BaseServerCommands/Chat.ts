import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractChat extends ServerCommand {
    constructor(module: Module) {
        super(["chat", "срфе"], module, async (self) => {
            if(self.ctx.isChat) {
                let members = await self.module.bot.database.chats.getChatUsers(self.ctx.chatId);
                let users = [];
                for(let i = 0; i < members.length; i++) {
                    let u = await self.module.db.getUserStats(members[i], self.args.mode || 0);
                    if(u.id && !users.some(uu => uu.id == u.id)) {
                        users.push(u);
                    }
                }
                users = users.filter(a => a.rank > 0 && a.pp > 0);
                users.sort((a,b) => {
                    if(a.rank > b.rank)
                        return 1;
                    else if(a.rank < b.rank)
                        return -1;
                    else return 0;
                });
                self.reply(`Топ${users.length > 15 ? '-15' : ''} беседы (ID ${self.ctx.chatId}):\n${users.splice(0, 15).map((user, i) => `#${i+1} ${user.nickname} ${self.module.bot.donaters.status(self.module.statusGetter, user.id)} | ${Util.round(user.pp, 1)}pp | Ранк ${user.rank} | ${Util.round(user.acc, 2)}%`).join("\n")}`);
            } else if(self.ctx.isFromUser) {
                if(!self.args.string[0])
                    return self.reply("Укажите ID беседы!");
                let id = parseInt(self.args.string[0]);
                if(isNaN(id))
                    return self.reply("Некорректный ID!");
                let members = await self.module.bot.database.chats.getChatUsers(self.ctx.chatId);
                let users = [];
                for(let i = 0; i < members.length; i++) {
                    let u = await self.module.db.getUserStats(members[i], self.args.mode || 0);
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
                self.reply(`Топ беседы (ID ${id}):\n${users.map((user, i) => `#${i+1} ${user.nickname} ${self.module.bot.donaters.status(self.module.statusGetter, user.id)} | ${Util.round(user.pp, 1)}pp | Ранк ${user.rank} | ${Util.round(user.acc, 2)}%`).join("\n")}`);
            }
        });
    }
}