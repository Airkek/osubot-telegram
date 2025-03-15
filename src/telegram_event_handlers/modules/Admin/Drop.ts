import { Command } from "../../Command";
import { Module } from "../Module";

export default class DropCommand extends Command {
    constructor(module: Module) {
        super(["drop", "вкщз"], module, async (ctx, self, args) => {
            const arg = args.full[0];
            if (arg === undefined && !ctx.replyMessage) {
                await ctx.send("Перешлите сообщение или напишите id пользователя!");
                return;
            }

            const id = arg !== undefined ? Number(arg) : ctx.replyMessage.senderId;
            if (isNaN(id)) {
                await ctx.send("Невалидный id");
                return;
            }

            await self.module.bot.database.drop.dropUser(id);

            await ctx.send(`Привязки ников tg://user?id=${id} удалены!`);
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
