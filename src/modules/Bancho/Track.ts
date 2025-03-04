import { Module } from "../../Module";
import { ServerCommand } from "../BaseServerCommands/BasicServerCommand";

export default class BanchoTrack extends ServerCommand {
    constructor(module: Module) {
        super(
            ["update", "гзвфеу"],
            module,
            async (self) => {
                const mode = self.args.mode === null ? (self.user.dbUser?.mode ?? 0) : self.args.mode;
                const nickname = self.user.username ?? self.user.dbUser.nickname;
                const update = await self.module.bot.track.getChanges(nickname, mode);
                await self.reply(self.module.bot.templates.Track(update));
            },
            true
        );
    }
}
