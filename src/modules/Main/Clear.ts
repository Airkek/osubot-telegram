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

            const members = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
            const realCount = await ctx.countMembers();
            const count = members.length;
            let kicked = 0;

            const estimate = count / 8;
            let estimateStr = `${Math.ceil(estimate)} сек.`
            if (estimate > 60) {
                estimateStr = `${Math.floor(estimate / 60)} мин. ${Math.ceil(estimate % 60)} сек.`
            }

            await ctx.reply(`Проводится чистка топа от вышедших пользователей.

Участников в чате: ${realCount}
Зарегистрированных участников чата: ${count}

Примерное время ожидания: ${estimateStr}`);

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
