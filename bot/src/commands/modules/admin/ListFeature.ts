import { Command } from "commands/Command";
import { Module } from "commands/Module";

export class ListFeature extends Command {
    constructor(module: Module) {
        super(["listfeature", "lf", "да"], module, async (ctx, self) => {
            const features = await self.module.bot.storage.featureFlags.listFeatures();
            const featureList = features
                .map(
                    (entry) =>
                        `${entry.feature}: ${ctx.tr(
                            entry.enabled_for_all ? "admin-feature-state-enabled" : "admin-feature-state-disabled"
                        )}`
                )
                .join("\n");
            await ctx.reply(ctx.tr("admin-feature-list", { features: featureList }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
