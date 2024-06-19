import axios from "axios";
import { Command } from "../../Command";
import { Module } from "../../Module";
import Util from "../../Util";
import { APIUser, IDatabaseUser } from "../../Types";
import { ServerCommand } from "./BasicServerCommand";

export default class AbstractUser extends ServerCommand {
    ignoreDbUpdate: boolean;

    constructor(module: Module, ignoreDbUpdate: boolean = false) {
        super(["user", "u", "г", "гыук"], module, async (self) => {
            let user: APIUser = undefined;
            let dbUser: IDatabaseUser = undefined;
            if (self.args.nickname[0]) {
                user = await self.module.api.getUser(self.args.nickname.join(" "));
            } else {
                if(self.ctx.hasReplyMessage) {
                    dbUser = await self.module.db.getUser(self.ctx.replyMessage.senderId);

                    if(!dbUser.nickname) {
                        return self.reply(`У этого пользователя не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }                    
                } else {
                    dbUser = await self.module.db.getUser(self.ctx.senderId);

                    if(!dbUser.nickname) {
                        return self.reply(`Не указан ник!\nПривяжите через ${module.prefix[0]} nick <ник>`);
                    }
                }

                user = await self.module.api.getUserById(dbUser.uid);
            }
            
            let mode = self.args.mode === null ? dbUser?.mode || 0 : self.args.mode;

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

            self.reply(`${self.module.bot.templates.User(user, mode, status, self.module.link)}`, {
                keyboard 
            });
        });

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
};