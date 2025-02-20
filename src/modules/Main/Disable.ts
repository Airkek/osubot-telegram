import { Command } from "../../Command";
import { Module } from "../../Module";

export default class DisableCommand extends Command {
    disables = false;

    constructor(module: Module) {
        super(["disable", "enable"], module, async (ctx, self) => {
            if (!ctx.isChat) {
                await ctx.reply("Данная команда только для чатов!");
                return;
            }

            try {
                const isAdmin = await ctx.isAdmin();
                if (!isAdmin) {
                    return;
                }

                const isDisabled = self.module.bot.disabled.includes(
                    ctx.peerId
                );

                if (isDisabled) {
                    self.module.bot.disabled = self.module.bot.disabled.filter(
                        (d) => d != ctx.peerId
                    );
                } else {
                    self.module.bot.disabled.push(ctx.peerId);
                }

                await ctx.reply(`Бот ${isDisabled ? "включен" : "отключен"}`);
            } catch {
                // ignore
            }
        });
    }
}
