import { ServerModule } from "../Module";
import Util from "../../../Util";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractChat extends ServerCommand {
    constructor(module: ServerModule) {
        super(["chat", "срфе"], module, async (self) => {
            let id = self.ctx.chatId;
            if (self.args.nickname[0]) {
                id = parseInt(self.args.nickname[0]);
                if (isNaN(id)) {
                    await self.reply(self.ctx.tr("chat-id-invalid"));
                    return;
                }
            } else if (!self.ctx.isInGroupChat) {
                await self.reply(self.ctx.tr("give-chat-id"));
                return;
            }

            const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;

            const members = await self.module.bot.database.chats.getChatUsers(id);
            let users = [];
            for (let i = 0; i < members.length; i++) {
                const u = await self.module.db.getUserStats(members[i], mode);
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

            let text = `${self.ctx.tr("top-15-of-chat")} (ID ${id}) [${modeStr}]:\n${users
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
