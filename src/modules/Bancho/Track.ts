import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class BanchoTrack extends Command {
    constructor(module: Module) {
        super(["update", "гзвфеу"], module, async (ctx, self, args) => {
            let dbUser = await self.module.bot.database.servers.bancho.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.bancho.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.bot.database.servers.bancho.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            if(!dbUser.nickname)
                return ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
            try {
                let update = await self.module.bot.track.getChanges(dbUser.nickname, dbUser.mode || 0);
                ctx.reply(self.module.bot.templates.Track(update));
            } catch (e) {
                let err = await self.module.bot.database.errors.addError("b", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}