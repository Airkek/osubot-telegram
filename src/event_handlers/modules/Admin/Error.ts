import { Command } from "../../Command";
import { Module } from "../Module";

export default class ErrorCommand extends Command {
    constructor(module: Module) {
        super(["e", "err", "error", "у", "укк", "уккщк"], module, async (ctx, self, args) => {
            const err = await self.module.bot.storage.errors.getError(args.fullString);

            if (!err) {
                await ctx.reply(ctx.tr("admin-error-not-found"));
                return;
            }

            await ctx.reply(ctx.tr("admin-error-details", { code: err.code, info: err.info, error: err.error }));
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
