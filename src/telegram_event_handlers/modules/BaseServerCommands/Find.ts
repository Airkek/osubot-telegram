import { ServerModule } from "../Module";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractFind extends ServerCommand {
    constructor(module: ServerModule) {
        super(["find", "f", "а", "аштв"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(self.ctx.tr("specify-nickname"));
                return;
            }

            const u = await self.module.api.getUser(self.args.nickname.join(" "));
            const users = await self.module.db.findByUserId(u.id);
            if (!users || users.length == 0) {
                await self.reply(self.ctx.tr("no-users-found-nickname-find"));
                return;
            }

            let usersText = "";
            for (let i = 0; i < users.length; i++) {
                const mention = await self.module.bot.database.userInfo.getMention(users[i].id);
                usersText += `${i + 1}. ${mention}\n`;
            }
            usersText = usersText.trim();

            const keyboard = [
                [
                    {
                        text: self.ctx.tr("check-profile-button"),
                        command: `${self.module.prefix[0]} user ${u.nickname}`,
                    },
                ],
            ];

            await self.reply(
                self.ctx.tr("users-with-nickname-find", {
                    nickname: u.nickname,
                }) +
                    ":\n" +
                    usersText,
                { keyboard }
            );
        });
    }
}
