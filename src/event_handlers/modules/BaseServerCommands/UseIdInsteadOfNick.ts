import { ServerModule } from "../Module";
import { ServerCommand } from "../../ServerCommand";

export default class UseIdInsteadOfNick extends ServerCommand {
    constructor(module: ServerModule) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            await self.reply(
                self.ctx.tr("use-id-command-instead-of-nick", {
                    prefix: module.prefix[0],
                })
            );
        });
    }
}
