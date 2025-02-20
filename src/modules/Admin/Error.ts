import { Command } from "../../Command";
import { Module } from "../../Module";

export default class ErrorCommand extends Command {
    constructor(module: Module) {
        super(
            ["e", "err", "error", "у", "укк", "уккщк"],
            module,
            async (ctx, self, args) => {
                const err = await self.module.bot.database.errors.getError(
                    args.string[0]
                );

                if (!err) {
                    await ctx.reply("Не найдено!");
                    return;
                }

                await ctx.reply(`Ошибка ${err.code}:
${err.info}

${err.error}`);
            }
        );

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
