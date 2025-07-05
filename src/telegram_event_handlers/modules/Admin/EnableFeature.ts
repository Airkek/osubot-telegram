import { Command } from "../../Command";
import { Module } from "../Module";
import { ControllableFeature } from "../../../data/Models/FeatureControlModel";

export default class EnableFeature extends Command {
    constructor(module: Module) {
        super(["enablefeature", "ef", "уа"], module, async (ctx, self, args) => {
            const feature = args.full[0].toLowerCase().trim();
            const features = await self.module.bot.database.featureControlModel.listFeatures();
            const found = features.find((entry) => entry.feature == feature);

            if (!found) {
                await ctx.reply(
                    `Фича не найдена, доступные:\n` +
                        features.map((ft) => `${ft.feature}: ${ft.enabled_for_all}`).join("\n")
                );
                return;
            }

            await self.module.bot.database.featureControlModel.enableFeature(feature as ControllableFeature);
            await ctx.reply("Фича включна");
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
