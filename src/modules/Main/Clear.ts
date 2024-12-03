import { Command } from "../../Command";
import { Module } from "../../Module";

export default class ClearCommand extends Command {
    constructor(module: Module) {
        super(["clear", "сдуфк"], module, async (ctx, self, args) => {
            if (!ctx.isChat) {
                return ctx.reply("Эту команду можно вводить только в чате");
            }

            if (!ctx.isAdmin()) {
                return ctx.reply("Эту команду может использовать только администратор чата");
            }

            await ctx.reply("Проводится чистка топа от вышедших пользователей");

            const members = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
            const count = members.length;
            let kicked = 0;

            for (const member of members) {
                if (member == ctx.senderId) {
                    continue; // dont do useless request
                }

                const inGroup = await ctx.isUserInChat(member);

                if (!inGroup) {
                    await self.module.bot.database.chats.userLeft(member, ctx.chatId);
                    kicked++;
                }
            }

            await ctx.reply(`Проведена чистка топа от вышедших пользователей.

Было зарегистрировано учатсников чата: ${count}
Из них больше не являются участниками чата: ${kicked}
Осталось зарегистрированными: ${count - kicked}`);
        });
    }
}
