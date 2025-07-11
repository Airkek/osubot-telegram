import { Command } from "../../Command";
import { Module } from "../Module";

export default class ClearCommand extends Command {
    rate = {};

    constructor(module: Module) {
        super(["clear", "сдуфк"], module, async (ctx, self) => {
            if (!ctx.isInGroupChat) {
                await ctx.reply(ctx.tr("command-for-chats-only"));
                return;
            }

            const isAdmin = await ctx.isSenderAdmin();
            if (!isAdmin) {
                await ctx.reply(ctx.tr("clear-sender-not-admin"));
                return;
            }

            if (this.checkLimit(ctx.chatId)) {
                await ctx.reply(ctx.tr("clear-give-admin"));
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
            let estimateStr = `${Math.ceil(estimate)}s.`;
            if (estimate > 60) {
                estimateStr = `${Math.floor(estimate / 60)}m. ${Math.ceil(estimate % 60)}s.`;
            }

            await ctx.reply(
                ctx.tr("clear-started", {
                    realCount,
                    count,
                    estimateStr,
                })
            );

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

            await ctx.reply(
                ctx.tr("clear-done", {
                    count,
                    kicked,
                    remain: count - kicked,
                })
            );
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
