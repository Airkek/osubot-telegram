import { Command } from "../../Command";
import { Module } from "../Module";

export default class StatusCommand extends Command {
    constructor(module: Module) {
        super(["status", "ыефегы"], module, async (ctx, self) => {
            const uptime = Math.floor((Date.now() - self.module.bot.startTime) / 1e3);
            const uptimeText = `${Math.floor(uptime / 3600 / 24)}д ${Math.floor(uptime / 3600) % 24}ч ${Math.floor(uptime / 60) % 60}м ${uptime % 60}с`;

            await ctx.send(
                `${ctx.tr("bot_status_header")}\n\n` +
                    `${ctx.tr("bot_version")}: ${self.module.bot.version}\n` +
                    `${ctx.tr("bot_uptime")}: ${uptimeText}\n` +
                    `${ctx.tr("bot_grafana_link")}: ${process.env.GRAFANA_LINK}`
            );
        });
    }
}
