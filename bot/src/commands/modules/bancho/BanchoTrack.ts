import { ServerModule } from "commands/ServerModule";
import { ServerCommand } from "commands/ServerCommand";

export class BanchoTrack extends ServerCommand {
    constructor(module: ServerModule) {
        super(
            ["update", "гзвфеу"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? (self.user.dbUser?.mode ?? 0) : self.args.mode;
                let userId = parseInt(self.user.dbUser?.game_id);
                if (self.user.username) {
                    const data = await self.module.api.getUser(self.user.username);
                    userId = data.id as number;
                }
                const update = await self.module.bot.track.getChanges(userId, mode);
                await self.reply(self.module.bot.templates.Track(self.ctx, update));
            },
            true
        );
    }
}
