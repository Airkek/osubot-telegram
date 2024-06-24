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
            let mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
            let user = self.user.username 
                ? await self.module.api.getUser(self.user.username, mode) 
                : await self.module.api.getUserById(self.user.id || self.user.dbUser.uid, mode);

            let status = self.module.bot.donaters.status(self.module.statusGetter, user.id);
            if (!this.ignoreDbUpdate) {
                self.module.db.updateInfo(user, mode);
            }
            let keyboard = Util.createKeyboard([
                self.module.api.getUserTopById ? [{
                    text: `Топ скоры ${user.nickname}`,
                    command: `${module.prefix[0]} top ${user.nickname} ${Util.getModeArg(mode)}`
                }] : [],
                self.module.api.getScoreByUid ? [{
                    text: `Последний скор ${user.nickname}`,
                    command: `${module.prefix[0]} recent ${user.nickname} ${Util.getModeArg(mode)}`
                }] : []
            ]);

            self.reply(`${self.module.bot.templates.User(user, mode, status, self.module.link)}`, {
                keyboard 
            });
        }, true);

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
};