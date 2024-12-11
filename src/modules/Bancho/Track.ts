import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";
import { ServerCommand } from "../BaseServerCommands/BasicServerCommand";

export default class BanchoTrack extends ServerCommand {
    constructor(module: Module) {
        super(["update", "гзвфеу"], module, async (self) => {
            let dbUser = await self.module.bot.database.servers.bancho.getUser(self.ctx.senderId);
            if(self.ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.bancho.getUser(self.ctx.replyMessage.senderId)).nickname;
            if(self.args.nickname[0])
                dbUser.nickname = self.args.nickname.join(" ");
            if(!dbUser.nickname)
                return self.ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);

            let update = await self.module.bot.track.getChanges(dbUser.nickname, dbUser.mode || 0);
            self.reply(self.module.bot.templates.Track(update));
        });
    }
}