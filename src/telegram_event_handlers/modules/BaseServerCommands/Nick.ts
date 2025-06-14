import { ServerModule } from "../Module";
import { ServerCommand } from "../../ServerCommand";
import { APIUser } from "../../../Types";

export default class AbstractNick extends ServerCommand {
    constructor(module: ServerModule) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    self.ctx.tr("nickname-not-specified", {
                        prefix: module.prefix[0],
                    })
                );
                return;
            }

            let user: APIUser;
            try {
                user = await self.module.api.getUser(self.args.nickname.join(" "));
            } catch {
                await self.reply(self.ctx.tr("user-not-found"));
                return;
            }

            await self.module.db.setNickname(self.ctx.senderId, user.id, user.nickname, user.mode);
            await self.reply(`${self.ctx.tr("nickname-set")}: ${user.nickname}`);
        });
    }
}
