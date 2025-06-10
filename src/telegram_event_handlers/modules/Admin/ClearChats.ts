import { Command } from "../../Command";
import { Module } from "../Module";

export default class ClearChatsCommand extends Command {
    constructor(module: Module) {
        super(["clearchats", "сдуфксрфеы"], module, async (ctx, self) => {
            const chats = await self.module.bot.database.chats.getChats();

            await ctx.reply(`Идёт чистка чатов. Всего чатов: ${chats.length}`);

            let removed = 0;
            for (const chatId of chats) {
                const isValid = await ctx.isBotInChat(chatId);
                if (!isValid) {
                    removed++;
                    await self.module.bot.database.chats.removeChat(chatId);
                }
            }

            const newCount = await self.module.bot.database.chats.getChatCount();
            await ctx.reply(
                `Чистка чатов выполнена.\n\nБыло чатов: ${chats.length}\nУдалено чатов: ${removed}\nОсталось чатов: ${newCount}`
            );
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
