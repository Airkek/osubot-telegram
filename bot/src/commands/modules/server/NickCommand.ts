import { ServerModule } from "commands/ServerModule";
import { IGameUser } from "games/users/IGameUser";
import { ServerCommand } from "commands/ServerCommand";
import { IGameUserRepository } from "core/storage/IGameUserRepository";
import { IGameApi } from "games/IGameApi";
import { UserNotFoundError } from "core/errors/UserNotFoundError";

export class NickCommand extends ServerCommand {
    constructor(module: ServerModule, masterApi?: IGameApi, masterDb?: IGameUserRepository) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    self.ctx.tr("nickname-not-specified", {
                        prefix: self.module.prefix[0],
                    })
                );
                return;
            }

            let user: IGameUser;
            try {
                user = await (masterApi ?? self.module.api).getUser(self.args.nickname.join(" "));
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    await self.reply(self.ctx.tr("user-not-found"));
                    return;
                }
                throw error;
            }

            await (masterDb ?? self.module.db).setNickname(self.ctx.userId, user.id, user.nickname, user.mode);
            await self.reply(`${self.ctx.tr("nickname-set")}: ${user.nickname}`);
        });
    }
}
