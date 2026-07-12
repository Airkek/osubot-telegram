import { ServerModule } from "commands/ServerModule";
import { ServerCommand } from "commands/ServerCommand";

export class UseIdInsteadOfNickCommand extends ServerCommand {
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
