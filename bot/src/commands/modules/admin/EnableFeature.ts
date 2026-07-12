import { Command } from "commands/Command";
import { Module } from "commands/Module";
import { ControllableFeature } from "core/storage/ControllableFeature";

export class EnableFeature extends Command {
    constructor(module: Module) {
        super(["enablefeature", "ef", "уа"], module, async (ctx, self, args) => {
            const feature = args.full[0]?.toLowerCase().trim();
            const features = await self.module.bot.storage.featureFlags.listFeatures();
            const found = features.find((entry) => entry.feature == feature);

            if (!found) {
                const featureList = features
                    .map(
                        (entry) =>
                            `${entry.feature}: ${ctx.tr(
                                entry.enabled_for_all ? "admin-feature-state-enabled" : "admin-feature-state-disabled"
                            )}`
                    )
                    .join("\n");
                await ctx.reply(ctx.tr("admin-feature-not-found", { features: featureList }));
                return;
            }

            await self.module.bot.storage.featureFlags.enableFeature(feature as ControllableFeature);
            await ctx.reply(ctx.tr("admin-feature-enabled", { feature }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
