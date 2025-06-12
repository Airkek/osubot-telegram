import { Command } from "../../Command";
import { Module } from "../Module";
import { OsuReplay } from "../simple_commands/OsuReplay";
import Main from "./index";
import Admin from "../Admin";

export default class StatusCommand extends Command {
    constructor(module: Module) {
        super(["status", "ыефегы"], module, async (ctx, self) => {
            const uptime = Math.floor((Date.now() - self.module.bot.startTime) / 1e3);
            const uptimeHours = uptime / 3600;
            const up = `${Math.floor(uptime / 3600 / 24)}д ${Math.floor(uptime / 3600) % 24}ч ${Math.floor(uptime / 60) % 60}м ${uptime % 60}с`;

            let cmdsUsed = 0;
            let replaysReceived = 0;
            let replaysRendered = 0;
            let failedRenders = 0;
            let replaysRenderedExperimental = 0;
            let failedRendersExperimental = 0;
            self.module.bot.modules.forEach((m) => {
                m.commands.forEach((c) => {
                    if (m instanceof Main || m instanceof Admin) {
                        return;
                    }

                    cmdsUsed += c.uses;
                    if (c instanceof OsuReplay) {
                        replaysReceived = c.uses;
                        replaysRendered = c.rendered;
                        failedRenders = c.failedRenders;
                        replaysRenderedExperimental = c.rendered_experimental;
                        failedRendersExperimental = c.failedRenders_experimental;
                    }
                });
            });

            const chatCount = await self.module.bot.database.chats.getChatCount();

            const msgsPerHour = (self.module.bot.totalMessages / uptimeHours).toFixed(3);
            const cmdsPerHour = (cmdsUsed / uptimeHours).toFixed(3);
            const cmdsPerMessage = ((cmdsUsed / self.module.bot.totalMessages) * 100).toFixed(2);
            const replaysPerCommands = ((replaysReceived / cmdsUsed) * 100).toFixed(2);

            const rendersPerCommands = (
                ((replaysRendered + failedRenders + replaysRenderedExperimental + failedRendersExperimental) /
                    cmdsUsed) *
                100
            ).toFixed(2);

            await ctx.send(
                `Статус бота:\n\n` +
                    `Версия: ${self.module.bot.version}\n` +
                    `Время работы: ${up}\n` +
                    `Чатов, известных боту: ${chatCount}\n` +
                    `Сообщений получено: ${self.module.bot.totalMessages}\n` +
                    `Команд использовано: ${cmdsUsed}\n` +
                    `Сообщений в час: ${msgsPerHour}\n` +
                    `Команд в час: ${cmdsPerHour}\n` +
                    `Процент команд от сообщений: ${cmdsPerMessage}%\n` +
                    `Реплеев получено: ${replaysReceived}\n` +
                    `Реплеев отрендерено (s/e): ${replaysRendered}/${failedRendersExperimental}\n` +
                    `Ошибок рендера (s/e): ${failedRenders}/${failedRendersExperimental}\n` +
                    `Процент реплеев от команд: ${replaysPerCommands}%\n` +
                    `Процент рендеров от команд: ${rendersPerCommands}%`
            );
        });
    }
}
