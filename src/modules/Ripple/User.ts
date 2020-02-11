import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class RippleUser extends Command {
    constructor(module: Module) {
        super(["u", "user"], module, async (ctx, self, args) => {
            let dbUser = await self.module.bot.database.servers.ripple.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.bot.database.servers.ripple.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.bot.database.servers.ripple.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            if(!dbUser.nickname)
                return ctx.reply("Не указан ник!");
            let mode = args.mode === null ? dbUser.mode || 0 : args.mode;
            try {
                let user = await self.module.bot.api.ripple.getUser(dbUser.nickname, mode);
                let status = self.module.bot.donaters.status("ripple", user.id);
                self.module.bot.database.servers.ripple.updateInfo(user, mode);
                let keyboard = Util.createKeyboard([
                    [{
                        text: `[R] Топ скоры ${user.nickname}`,
                        command: `r t ${user.nickname} ${Util.getModeArg(mode)}`
                    }],
                    [{
                        text: `[R] Последний скор ${user.nickname}`,
                        command: `r r ${user.nickname} ${Util.getModeArg(mode)}`
                    }]
                ]);
                ctx.reply(`[Server:${self.module.name}]\n${self.module.bot.templates.User(user, mode, status, self.module.link)}`, { keyboard });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError("r", ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });
    }
}