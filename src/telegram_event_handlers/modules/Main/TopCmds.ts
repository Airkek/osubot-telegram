import { Command } from "../../Command";
import { Module } from "../Module";

export default class TopCmdsCommand extends Command {
    constructor(module: Module) {
        super(["topcmds", "ещзсьвы"], module, async (ctx, self) => {
            let commands: Command[] = [];
            self.module.bot.modules.forEach((m) => {
                m.commands.forEach((c) => {
                    if (m.name != "Main" && m.name != "Admin") {
                        commands.push(c);
                    }
                });
            });
            commands = commands
                .sort((a, b) => b.uses - a.uses)
                .filter((c) => c.uses != 0)
                .splice(0, 5);
            await ctx.send(
                `Топ команд:\n${commands.map((c) => `[${c.module.name}] ${Array.isArray(c.name) ? c.name[0] : c.name} - ${c.uses} использований`).join("\n")}`
            );
        });
    }
}
