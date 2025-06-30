import { ServerModule } from "../Module";
import { ServerCommand } from "../../ServerCommand";
import { APIUser, IDatabaseServer } from "../../../Types";
import IAPI from "../../../api/base";

export default class AbstractNick extends ServerCommand {
    constructor(module: ServerModule, masterApi?: IAPI, masterDb?: IDatabaseServer) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    self.ctx.tr("nickname-not-specified", {
                        prefix: self.module.prefix[0],
                    })
                );
                return;
            }

            let user: APIUser;
            try {
                user = await (masterApi ?? self.module.api).getUser(self.args.nickname.join(" "));
            } catch {
                await self.reply(self.ctx.tr("user-not-found"));
                return;
            }

            await (masterDb ?? self.module.db).setNickname(self.ctx.senderId, user.id, user.nickname, user.mode);
            await self.reply(`${self.ctx.tr("nickname-set")}: ${user.nickname}`);
        });
    }
}
