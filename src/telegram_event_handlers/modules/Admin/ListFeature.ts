import { Command } from "../../Command";
import { Module } from "../Module";

export default class ListFeature extends Command {
    constructor(module: Module) {
        super(["listfeature", "lf", "да"], module, async (ctx, self) => {
            const features = await self.module.bot.database.featureControlModel.listFeatures();
            await ctx.reply(
                `Доступные фичи:\n` + features.map((ft) => `${ft.feature}: ${ft.enabled_for_all}`).join("\n")
            );
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
