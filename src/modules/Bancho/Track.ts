import { Module } from "../../Module";
import { ServerCommand } from "../BaseServerCommands/BasicServerCommand";

export default class BanchoTrack extends ServerCommand {
    constructor(module: Module) {
        super(["update", "гзвфеу"], module, async (self) => {
            const dbUser = await self.module.bot.database.servers.bancho.getUser(self.ctx.senderId);
            if (self.ctx.hasReplyMessage) {
                dbUser.nickname = (
                    await self.module.bot.database.servers.bancho.getUser(self.ctx.replyMessage.senderId)
                ).nickname;
            }
            if (self.args.nickname[0]) {
                dbUser.nickname = self.args.nickname.join(" ");
            }
            if (!dbUser) {
                await self.ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                return;
            }

            const update = await self.module.bot.track.getChanges(dbUser.nickname, dbUser.mode || 0);
            await self.reply(self.module.bot.templates.Track(update));
        });
    }
}
