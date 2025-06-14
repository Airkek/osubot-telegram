import { ServerModule } from "../Module";
import Util from "../../../Util";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractUser extends ServerCommand {
    ignoreDbUpdate: boolean;

    constructor(module: ServerModule, ignoreDbUpdate: boolean = false) {
        super(
            ["user", "u", "г", "гыук"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? self.user.dbUser?.mode || 0 : self.args.mode;
                const user = self.user.username
                    ? await self.module.api.getUser(self.user.username, mode)
                    : await self.module.api.getUserById(self.user.id || self.user.dbUser.game_id, mode);

                if (!this.ignoreDbUpdate) {
                    await self.module.db.updateInfo(user, mode);
                }

                const keyboard = Util.createKeyboard([
                    self.module.api.getUserTopById
                        ? [
                              {
                                  text: self.ctx.tr("players-top-scores", {
                                      player_name: user.nickname,
                                  }),
                                  command: `${module.prefix[0]} top ${self.module.api.getUserTop ? user.nickname : user.id} ${Util.getModeArg(mode)}`,
                              },
                          ]
                        : [],
                    self.module.api.getUserRecentById
                        ? [
                              {
                                  text: self.ctx.tr("players-recent-score", {
                                      player_name: user.nickname,
                                  }),
                                  command: `${module.prefix[0]} recent ${self.module.api.getUserRecent ? user.nickname : user.id} ${Util.getModeArg(mode)}`,
                              },
                          ]
                        : [],
                ]);

                await self.reply(`${self.module.bot.templates.User(self.ctx, user, mode, self.module.link)}`, {
                    keyboard,
                });
            },
            true
        );

        this.ignoreDbUpdate = ignoreDbUpdate;
    }
}
