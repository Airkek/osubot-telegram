import { ServerModule } from "../Module";
import Util from "../../../Util";
import { ServerCommand } from "../../ServerCommand";

export default class AbstractFind extends ServerCommand {
    constructor(module: ServerModule) {
        super(["find", "f", "а", "аштв"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(self.ctx.tr("specify-nickname"));
                return;
            }

            const u = await self.module.api.getUser(self.args.nickname.join(" "));
            const users = await self.module.db.findByUserId(u.id);
            if (!users[0]) {
                await self.reply(self.ctx.tr("no-users-found-nickname-find"));
                return;
            }
            const keyboard = Util.createKeyboard([
                [
                    {
                        text: self.ctx.tr("check-profile-button"),
                        command: `${self.module.prefix[0]} user ${u.nickname}`,
                    },
                ],
            ]);
            await self.reply(
                self.ctx.tr("users-with-nickname-find", {
                    nickname: u.nickname,
                }),
                { keyboard }
            );
        });
    }
}
