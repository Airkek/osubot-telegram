import { Command } from "../../Command";
import { Module } from "../Module";
import { createHash } from "node:crypto";

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
                const chats = await self.module.bot.storage.notificationAudience.getChatsForNotifications();
                const users = await self.module.bot.storage.notificationAudience.getUsersForNotifications();
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
                        await ctx.edit(ctx.tr("admin-notify-cancelled"));
                        return;
                }

                await ctx.edit(ctx.tr("admin-notify-started"));

                let errors = 0;
                let sent = 0;
                let dirtyChats = 0;
                for (const chatId of target) {
                    try {
                        global.logger.info(`Sending message to '${chatId}'`);
                        await this.module.bot.sendMessage(chatId, text);
                        sent++;
                    } catch (e) {
                        if (
                            e.message.includes("bot was kicked from the") ||
                            e.message.includes("the group chat was deleted")
                        ) {
                            await this.module.bot.storage.memberships.removeChat(chatId);
                            dirtyChats++;
                        } else {
                            global.logger.error(e);
                            errors++;
                        }
                    }
                }

                await ctx.reply(ctx.tr("admin-notify-finished", { sent, errors, dirtyChats }));
                return;
            }

            const chatsToNotifyCount =
                await self.module.bot.storage.notificationAudience.getChatCountForNotifications();
            const usersToNotifyCount =
                await self.module.bot.storage.notificationAudience.getUserCountForNotifications();

            const textSplit = ctx.text.split("\n").splice(1);
            if (textSplit.length == 0) {
                await ctx.reply(ctx.tr("admin-notify-text-required"));
                return;
            }

            const text = textSplit.join("\n").trim();
            const hash = createHash("sha3-256").update(text).digest("hex").slice(0, 10);
            this.pending[hash] = text;

            await ctx.send(text);
            await ctx.reply(ctx.tr("admin-notify-audience", { users: usersToNotifyCount, chats: chatsToNotifyCount }), {
                keyboard: [
                    [{ text: ctx.tr("admin-notify-button-all"), command: `admin notify ${hash}:1` }],
                    [{ text: ctx.tr("admin-notify-button-users"), command: `admin notify ${hash}:2` }],
                    [{ text: ctx.tr("admin-notify-button-chats"), command: `admin notify ${hash}:3` }],
                    [{ text: ctx.tr("cancel-button"), command: `admin notify ${hash}:0` }],
                ],
            });
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }
}
