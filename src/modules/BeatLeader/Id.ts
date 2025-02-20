import { Module } from "../../Module";
import { ServerCommand } from "../BaseServerCommands/BasicServerCommand";

export default class AbstractNick extends ServerCommand {
    constructor(module: Module) {
        super(["id", "шв"], module, async (self) => {
            if (!self.args.nickname[0]) {
                await self.reply(
                    `Не указан id!\nИспользование: ${module.prefix[0]} id <id>`
                );
                return;
            }

            try {
                const user = await self.module.api.getUserById(
                    self.args.nickname[0]
                );
                await self.module.db.setNickname(
                    self.ctx.senderId,
                    user.id,
                    user.nickname
                );
                if (user.mode) {
                    await self.module.db.setMode(self.ctx.senderId, user.mode);
                }

                await self.reply(
                    `Установлен id: ${user.id} (${user.nickname})`
                );
            } catch {
                await self.reply("Такого пользователя не существует!");
            }
        });
    }
}
