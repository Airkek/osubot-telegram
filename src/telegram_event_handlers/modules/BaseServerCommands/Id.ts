import { ServerModule } from "../Module";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractNick extends ServerCommand {
    constructor(module: ServerModule) {
        super(["id", "шв"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    self.ctx.tr("user-id-not-specified", {
                        prefix: module.prefix[0],
                    })
                );
            }

            try {
                const user = await self.module.api.getUserById(self.args.nickname[0]);
                await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname);
                if (user.mode) {
                    await self.module.db.setMode(self.ctx.senderId, user.mode);
                }

                await self.reply(`${self.ctx.tr("user-id-set")}: ${user.id} (${user.nickname})`);
            } catch {
                await self.reply(self.ctx.tr("user-not-found"));
            }
        });
    }
}
