import { ServerModule } from "commands/ServerModule";
import { Util } from "shared/Util";
import { ServerCommand } from "commands/ServerCommand";

export class ChatCommand extends ServerCommand {
    constructor(module: ServerModule) {
        super(["chat", "срфе"], module, async (self) => {
            let chatId = self.ctx.chatId;
            let displayChatId = self.ctx.externalChatId;
            if (self.args.nickname[0]) {
                const chat = await self.module.bot.storage.identities.findChat(self.args.nickname[0]);
                if (!chat) {
                    await self.reply(self.ctx.tr("chat-id-invalid"));
                    return;
                }
                chatId = chat.chatId;
                displayChatId = chat.externalId;
            } else if (!self.ctx.isInGroupChat) {
                await self.reply(self.ctx.tr("give-chat-id"));
                return;
            }

            const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;

            const members = await self.module.bot.storage.memberships.getChatUsers(chatId);
            let users = [];
            for (let i = 0; i < members.length; i++) {
                const identity = await self.module.bot.storage.identities.getUser(members[i]);
                if (!identity) {
                    continue;
                }
                const u = await self.module.db.getUserStats(identity.userId, mode);
                if (u && !users.some((uu) => uu.id == u.id)) {
                    users.push(u);
                }
            }
            users = users.filter((a) => a.rank > 0 && a.pp > 0);
            users.sort((a, b) => {
                if (a.rank > b.rank) {
                    return 1;
                } else if (a.rank < b.rank) {
                    return -1;
                }
                return 0;
            });

            let modeStr = "STD";
            if (mode === 1) {
                modeStr = "Taiko";
            } else if (mode === 2) {
                modeStr = "CTB";
            } else if (mode === 3) {
                modeStr = "Mania";
            }

            let text = `${self.ctx.tr("top-15-of-chat")} (ID ${displayChatId}) [${modeStr}]:\n${users
                .splice(0, 15)
                .map(
                    (user, i) =>
                        `#${i + 1} ${user.nickname} | ${Util.round(user.pp, 1)}pp | ${self.ctx.tr("player-rank")} ${user.rank} | ${Util.round(user.acc, 2)}%`
                )
                .join("\n")}`;

            const isBotAdmin = await self.ctx.isBotAdmin();
            if (!isBotAdmin) {
                text += "\n\n" + self.ctx.tr("bot-is-not-admin-leaderboard");
            }

            await self.reply(text);
        });
    }
}
