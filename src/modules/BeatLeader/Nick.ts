import { Module } from "../../Module";
import { ServerCommand } from "../BaseServerCommands/BasicServerCommand";

export default class Nick extends ServerCommand {
    constructor(module: Module) {
        super(["nick", "n", "т", "тшсл"], module, async (self) => {
            await self.reply(
                `Для этого лидерборда недоступна установка никнейма!\nУстановите свой id, используя ${module.prefix[0]} id <id>`
            );
        });
    }
}
