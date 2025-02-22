import { Module } from "../../Module";
import { IDatabaseUser } from "../../Types";
import Mods from "../../pp/Mods";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractLeaderboard extends ServerCommand {
    constructor(module: Module) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (self) => {
            if (!self.ctx.isChat) {
                await self.reply("Эту команду можно использовать только в беседах!");
                return;
            }
            const chat = self.module.bot.maps.getChat(self.ctx.peerId);
            if (!chat) {
                await self.reply("Сначала отправьте карту!");
                return;
            }

            const profiles = await self.module.bot.database.chats.getChatUsers(self.ctx.chatId);
            const users: IDatabaseUser[] = [];
            for (let i = 0; i < profiles.length; i++) {
                const profile = profiles[i];
                const user = await self.module.db.getUser(profile);
                if (user && !users.some((u) => u.game_id == user.game_id)) {
                    users.push(user);
                }
            }
            const leaderboard = await self.module.api.getLeaderboard(
                chat.map.id.map,
                users,
                chat.map.mode,
                self.args.mods.length == 0 ? null : new Mods(self.args.mods).sum()
            );
            await self.reply(self.module.bot.templates.Leaderboard(leaderboard));
        });
    }
}
