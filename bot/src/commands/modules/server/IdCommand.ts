import { ServerModule } from "commands/ServerModule";
import { ServerCommand } from "commands/ServerCommand";
import { UserNotFoundError } from "core/errors/UserNotFoundError";

export class IdCommand extends ServerCommand {
    constructor(module: ServerModule) {
        super(["id", "шв"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    self.ctx.tr("user-id-not-specified", {
                        prefix: module.prefix[0],
                    })
                );
                return;
            }

            try {
                const user = await self.module.api.getUserById(self.args.nickname[0]);
                await self.module.db.setNickname(self.ctx.userId, user.id, user.nickname);
                if (user.mode) {
                    await self.module.db.setMode(self.ctx.userId, user.mode);
                }

                await self.reply(`${self.ctx.tr("user-id-set")}: ${user.id} (${user.nickname})`);
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    await self.reply(self.ctx.tr("user-not-found"));
                    return;
                }
                throw error;
            }
        });
    }
}
