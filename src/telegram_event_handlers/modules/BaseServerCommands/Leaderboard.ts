import { ServerModule } from "../Module";
import { IDatabaseUser } from "../../../Types";
import Mods from "../../../osu_specific/pp/Mods";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractLeaderboard extends ServerCommand {
    constructor(module: ServerModule) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (self) => {
            if (!self.ctx.isInGroupChat) {
                await self.reply(self.ctx.tr("command-for-chats-only"));
                return;
            }
            const chat = self.module.bot.maps.getChat(self.ctx.chatId);
            if (!chat) {
                await self.reply(self.ctx.tr("send-beatmap-first"));
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
                chat.map.id,
                users,
                chat.map.mode,
                self.args.mods.length == 0 ? null : new Mods(self.args.mods).sum()
            );

            let text = self.module.bot.templates.Leaderboard(self.ctx, leaderboard);

            const isBotAdmin = await self.ctx.isBotAdmin();
            if (!isBotAdmin) {
                text += "\n\n" + self.ctx.tr("bot-is-not-admin-leaderboard");
            }

            await self.reply(text);
        });
    }
}
