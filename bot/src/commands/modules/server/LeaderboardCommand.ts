import { ServerModule } from "commands/ServerModule";
import { IGameUserLink } from "games/users/IGameUserLink";
import { Mods } from "games/osu/performance/Mods";
import { ServerCommand } from "commands/ServerCommand";
import { getLeaderboard } from "application/LeaderboardService";

export class LeaderboardCommand extends ServerCommand {
    constructor(module: ServerModule) {
        super(["leaderboard", "lb", "ди", "дуфвукищфкв"], module, async (self) => {
            if (!self.ctx.isInGroupChat) {
                await self.reply(self.ctx.tr("command-for-chats-only"));
                return;
            }
            const chat = self.module.bot.chatBeatmaps.getChat(self.ctx.chatId);
            if (!chat) {
                await self.reply(self.ctx.tr("send-beatmap-first"));
                return;
            }

            const profiles = await self.module.bot.storage.memberships.getChatUsers(self.ctx.chatId);
            const users: IGameUserLink[] = [];
            for (let i = 0; i < profiles.length; i++) {
                const profile = profiles[i];
                const identity = await self.module.bot.storage.identities.getUser(profile);
                if (!identity) {
                    continue;
                }
                const user = await self.module.db.getUser(identity.userId);
                if (user && !users.some((u) => u.game_id == user.game_id)) {
                    users.push(user);
                }
            }
            const leaderboard = await getLeaderboard(
                self.module.api,
                self.module.beatmapProvider,
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
