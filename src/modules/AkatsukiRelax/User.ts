import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class AkatsukiUser extends Command {
    constructor(module: Module) {
        super(["user", "u", "г", "гыук"], module, async (ctx, self, args) => {
            let dbUser = await self.module.bot.database.servers.akatsuki.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.akatsuki.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.bot.database.servers.akatsuki.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            let mode = args.mode === null ? dbUser.mode || 0 : args.mode;
            if(!dbUser.nickname)
                return ctx.reply("Не указан ник!");
            try {
                let user = await self.module.bot.api.relax.getUser(dbUser.nickname, mode);
                let status = self.module.bot.donaters.status("akatsuki", user.id);
                
                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.User(user, mode, status, self.module.link)}`);
            } catch (e) {
                let err = await self.module.bot.database.errors.addError("a", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}