import { Command } from "../../Command";
import { Module } from "../../Module";

export default class TopCmdsCommand extends Command {
    constructor(module: Module) {
        super("topcmds", module, (ctx, self) => {
            let commands: Command[] = [];
            self.module.bot.modules.forEach(m => {
                m.commands.forEach(c => {
                    if(c.name != "topcmds" && c.module.name != "Admin")
                        commands.push(c);
                });
            });
            commands = commands.sort((a,b) => b.uses - a.uses).filter(c => c.uses != 0).splice(0, 5);
            ctx.send(`Топ команд:\n${commands.map(c => `[${c.module.name}] ${Array.isArray(c.name) ? c.name[c.name.length - 1] : c.name} - ${c.uses} использований`).join("\n")}`);
        });
    }
}