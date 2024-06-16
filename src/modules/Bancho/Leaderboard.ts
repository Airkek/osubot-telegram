import { Command } from "../../Command";
import { Module } from "../../Module";
import { IDatabaseUser } from "../../Types";
import Mods from "../../pp/Mods";

export default class BanchoLeaderboard extends Command {
    constructor(module: Module) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (ctx, self, args) => {
            if(!ctx.isChat)
                return ctx.reply("Эту команду можно использовать только в беседах!");
            let chat = self.module.bot.maps.getChat(ctx.peerId);
            if(!chat)
                return ctx.reply("Сначала отправьте карту!");
            try {
                let profiles = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
                let users: IDatabaseUser[] = [];
                for(let i = 0; i < profiles.length; i++) {
                    let profile = profiles[i];
                    let user = await self.module.bot.database.servers.bancho.getUser(profile);
                    if(user.id && !users.some(u => u.uid == user.uid))
                        users.push(user);
                }
                let leaderboard = await self.module.bot.api.bancho.getLeaderboard(chat.map.id.map, users, chat.map.mode, args.mods.length == 0 ? null : new Mods(args.mods).sum());
                ctx.reply(self.module.bot.templates.Leaderboard(leaderboard, self.module.name, self.module.bot.donaters.status.bind(self.module.bot.donaters)));
            } catch(e) {
                ctx.reply("Ошибка!");
            }
        });
    }
}