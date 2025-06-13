import { Command } from "../../Command";
import { Module } from "../Module";
import { createHash } from "node:crypto";
import Util from "../../../Util";

export default class NotifyCommand extends Command {
    pending = {};

    constructor(module: Module) {
        super(["notify", "тщешан"], module, async (ctx, self, args) => {
            if (ctx.messagePayload) {
                const eventSplit = args.fullString.split(":");
                if (eventSplit.length < 2) {
                    return;
                }

                const hash = eventSplit[0];
                if (!this.pending[hash]) {
                    return;
                }

                const text = this.pending[hash];
                this.pending[hash] = undefined;

                let target = [];
                const chats = await self.module.bot.database.notifications.getChatsForNotifications();
                const users = await self.module.bot.database.notifications.getUsersForNotifications();
                switch (eventSplit[1]) {
                    case "1":
                        target = chats.concat(users);
                        break;
                    case "2":
                        target = users;
                        break;
                    case "3":
                        target = chats;
                        break;
                    default:
                        await ctx.edit("Рассылка отменена");
                        return;
                }

                await ctx.edit(`Рассылка начата.`);

                let errors = 0;
                let sent = 0;
                let dirtyChats = 0;
                for (const chatId of target) {
                    try {
                        global.logger.info(`Sending message to '${chatId}'`);
                        await this.module.bot.tg.api.sendMessage(chatId, text);
                        sent++;
                    } catch (e) {
                        if (
                            e.message.includes("bot was kicked from the") ||
                            e.message.includes("the group chat was deleted")
                        ) {
                            await this.module.bot.database.chats.removeChat(chatId);
                            dirtyChats++;
                        } else {
                            global.logger.error(e);
                            errors++;
                        }
                    }
                }

                await ctx.reply(
                    `Рассылка окончена.\nВсего отправлено сообщений: ${sent}\nОшибок: ${errors}\nМусорных чатов: ${dirtyChats}`
                );
                return;
            }

            const chatsToNotifyCount = await self.module.bot.database.notifications.getChatCountForNotifications();
            const usersToNotifyCount = await self.module.bot.database.notifications.getUserCountForNotifications();

            const textSplit = ctx.text.split("\n").splice(1);
            if (textSplit.length == 0) {
                await ctx.reply("Не указан текст");
                return;
            }

            const text = textSplit.join("\n").trim();
            const hash = createHash("sha3-256").update(text).digest("hex").slice(0, 10);
            this.pending[hash] = text;

            await ctx.send(text);
            await ctx.reply(`Будет оповещено:\n${usersToNotifyCount} пользователей\n${chatsToNotifyCount} чатов`, {
                keyboard: Util.createKeyboard([
                    [{ text: "✅Отправить всем", command: `admin notify ${hash}:1` }],
                    [{ text: "✅Отправить только пользователям", command: `admin notify ${hash}:2` }],
                    [{ text: "✅Отправить только чатам", command: `admin notify ${hash}:3` }],
                    [{ text: ctx.tr("cancel-button"), command: `admin notify ${hash}:0` }],
                ]),
            });
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
