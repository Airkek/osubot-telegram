import { Command } from "../../Command";
import { Module } from "../Module";
import { ControllableFeature } from "../../../core/ApplicationStorage";

export default class DisableFeature extends Command {
    constructor(module: Module) {
        super(["disablefeature", "df", "ва"], module, async (ctx, self, args) => {
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

            await self.module.bot.storage.featureFlags.disableFeature(feature as ControllableFeature);
            await ctx.reply(ctx.tr("admin-feature-disabled", { feature }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
