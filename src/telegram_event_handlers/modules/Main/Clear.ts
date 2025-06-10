import { Command } from "../../Command";
import { Module } from "../Module";

export default class ClearCommand extends Command {
    rate = {};

    constructor(module: Module) {
        super(["clear", "сдуфк"], module, async (ctx, self) => {
            if (!ctx.isInGroupChat) {
                await ctx.reply("Эту команду можно вводить только в чате");
                return;
            }

            const isAdmin = await ctx.isSenderAdmin();
            if (!isAdmin) {
                await ctx.reply("Эту команду может использовать только администратор чата");
                return;
            }

            if (this.checkLimit(ctx.chatId)) {
                await ctx.reply(
                    "Чистка топа от вышедших пользователей доступна только раз в 24 часа.\n\nЧтобы не было необходимости её выполнять, дайте боту права администратора в чате."
                );
                return;
            }
            this.setLimit(ctx.chatId);

            const origMembers = await self.module.bot.database.chats.getChatUsers(ctx.chatId);
            const duplicates = new Set<number>();
            const members = new Set<number>();

            for (const member of origMembers) {
                if (members.has(member)) {
                    if (!duplicates.has(member)) {
                        duplicates.add(member);
                    }
                } else {
                    members.add(member);
                }
            }

            for (const member of duplicates) {
                await self.module.bot.database.chats.userLeft(member, ctx.chatId);
                await self.module.bot.database.chats.userJoined(member, ctx.chatId);
            }

            const realCount = await ctx.chatMembersCount();
            const count = members.size;
            let kicked = 0;

            const estimate = count / 8;
            let estimateStr = `${Math.ceil(estimate)} сек.`;
            if (estimate > 60) {
                estimateStr = `${Math.floor(estimate / 60)} мин. ${Math.ceil(estimate % 60)} сек.`;
            }

            await ctx.reply(`Проводится чистка топа от вышедших пользователей.

Участников в чате: ${realCount}
Зарегистрированных в боте участников чата: ${count}

Примерное время ожидания: ${estimateStr}`);

            for (const member of members) {
                if (member == ctx.senderId) {
                    continue;
                } // dont do useless request

                const inGroup = await ctx.isUserInChat(member);

                if (!inGroup) {
                    await self.module.bot.database.chats.userLeft(member, ctx.chatId);
                    kicked++;
                }
            }

            await ctx.reply(`Проведена чистка топа от вышедших пользователей.

Было зарегистрировано участников чата: ${count}
Из них больше не являются участниками чата: ${kicked}
Осталось зарегистрированными: ${count - kicked}`);
        });
    }

    private checkLimit(chat: number) {
        const TIMEOUT = 60 * 60 * 24; // 24 hour
        const u = this.rate[chat];
        const date = new Date().getTime();
        if (u) {
            return date - u < TIMEOUT * 1000;
        }

        return false;
    }

    private setLimit(chat: number) {
        this.rate[chat] = new Date().getTime();
    }

    private removeLimit(chat: number) {
        this.rate[chat] = 0;
    }
}
