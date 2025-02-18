import { Command } from "../../Command";
import { Module } from "../../Module";
import { IDatabaseUser } from "../../Types";
import Util from "../../Util";
import Mods from "../../pp/Mods";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractLeaderboard extends ServerCommand {
    constructor(module: Module) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (self) => {
            if(!self.ctx.isChat)
                return self.reply("Эту команду можно использовать только в беседах!");
            let chat = self.module.bot.maps.getChat(self.ctx.peerId);
            if(!chat)
                return self.reply("Сначала отправьте карту!");

            let profiles = await self.module.bot.database.chats.getChatUsers(self.ctx.chatId);
            let users: IDatabaseUser[] = [];
            for(let i = 0; i < profiles.length; i++) {
                let profile = profiles[i];
                let user = await self.module.db.getUser(profile);
                if(user.id && !users.some(u => u.game_id == user.game_id))
                    users.push(user);
            }
            let leaderboard = await self.module.api.getLeaderboard(chat.map.id.map, users, chat.map.mode, self.args.mods.length == 0 ? null : new Mods(self.args.mods).sum());
            self.reply(self.module.bot.templates.Leaderboard(leaderboard, self.module.name, self.module.bot.donaters.status.bind(self.module.bot.donaters)));
        });
    }
}