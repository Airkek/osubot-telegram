import { Command } from "../../Command";
import { Module } from "../../Module";

export default class StatusCommand extends Command {
    constructor(module: Module) {
        super(["status", "ыефегы"], module, async (ctx, self) => {
            const uptime = Math.floor((Date.now() - self.module.bot.startTime) / 1e3);
            const up = `${Math.floor(uptime / 3600 / 24)}д ${Math.floor(uptime / 3600) % 24}ч ${Math.floor(uptime / 60) % 60}м ${uptime % 60}с`;

            let cmdsUsed = 0;
            self.module.bot.modules.forEach((m) => {
                m.commands.forEach((c) => {
                    if (m.name != "Admin" && m.name != "Main") {
                        cmdsUsed += c.uses;
                    }
                });
            });

            await ctx.send(
                `Статус бота:\n\nВерсия: ${self.module.bot.version}\nВремя работы: ${up}\nСообщений получено: ${self.module.bot.totalMessages}\nКоманд использовано: ${cmdsUsed}`
            );
        });
    }
}
