import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class EnjuuUser extends Command {
    constructor(module: Module) {
        super(["u", "user"], module, async (ctx, self, args) => {
            let dbUser = await self.module.bot.database.servers.enjuu.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.enjuu.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.bot.database.servers.enjuu.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            if(!dbUser.nickname)
                return ctx.reply("Не указан ник!");
            try {
                let user = await self.module.bot.api.enjuu.getUser(dbUser.nickname, dbUser.mode || 0);
                let status = self.module.bot.donaters.status("enjuu", user.id);
                if(!dbUser.mode)
                    self.module.bot.database.servers.enjuu.updateInfo(user);
                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.User(user, dbUser.mode || 0, status, self.module.link)}`);
            } catch (e) {
                let err = await self.module.bot.database.errors.addError("a", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}