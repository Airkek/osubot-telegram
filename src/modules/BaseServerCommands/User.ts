import axios from "axios";
import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";

export default class AbstractUser extends Command {
    ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(["user", "u", "г", "гыук"], module, async (ctx, self, args) => {
            let dbUser = await self.module.db.getUser(ctx.senderId);
            if(ctx.hasReplyMessage)
                dbUser.nickname = (await self.module.db.getUser(ctx.replyMessage.senderId)).nickname;
            if(ctx.hasForwards)
                dbUser.nickname = (await self.module.db.getUser(ctx.forwards[0].senderId)).nickname;
            if(args.nickname[0])
                dbUser.nickname = args.nickname.join(" ");
            if(!dbUser.nickname)
                return ctx.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
            let mode = args.mode === null ? dbUser.mode || 0 : args.mode;
            try {
                let user = await self.module.api.getUser(dbUser.nickname, mode);
                let status = self.module.bot.donaters.status(self.module.statusGetter, user.id);
                if (!this.ignoreDbUpdate) {
                    self.module.db.updateInfo(user, mode);
                }
                let keyboard = Util.createKeyboard([
                    [{
                        text: `Топ скоры ${user.nickname}`,
                        command: `${module.prefix[0]} top ${user.nickname} ${Util.getModeArg(mode)}`
                    }],
                    [{
                        text: `Последний скор ${user.nickname}`,
                        command: `${module.prefix[0]} recent ${user.nickname} ${Util.getModeArg(mode)}`
                    }]
                ]);

                ctx.reply(`[Server: ${self.module.name}]\n${self.module.bot.templates.User(user, mode, status, self.module.link)}`, {
                    keyboard 
                });
            } catch(e) {
                let err = await self.module.bot.database.errors.addError(module.prefix[0], ctx, String(e));
                ctx.reply(`[Server: ${self.module.name}]\n${Util.error(String(e))} (${err})`);
            }
        });

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
};