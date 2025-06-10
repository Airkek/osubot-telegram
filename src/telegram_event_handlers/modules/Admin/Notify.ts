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
                const approved = eventSplit[1] == "1";
                if (!this.pending[hash]) {
                    return;
                }
                if (!approved) {
                    this.pending[hash] = undefined;
                    await ctx.edit("Рассылка отменена");
                    return;
                }

                const chats = await self.module.bot.database.chats.getChats();
                await ctx.reply(`Рассылка по чатам начата. Всего чатов: ${chats.length}`);

                let errors = 0;
                let sent = 0;
                for (const chatId of chats) {
                    try {
                        global.logger.info(`Sending message to '${chatId}'`);
                        await this.module.bot.tg.api.sendMessage(chatId, this.pending[hash]);
                        sent++;
                    } catch (e) {
                        global.logger.error(e);
                        errors++;
                    }
                }

                await ctx.reply(`Рассылка окончена.\nВсего отправлено: ${sent}\nОшибок: ${errors}`);
                return;
            }

            const textSplit = ctx.text.split("\n").slice(1);
            if (textSplit.length == 0) {
                await ctx.reply("Не указан текст");
                return;
            }

            const text = textSplit.join("\n").trim();
            const hash = createHash("sha3-256").update(text).digest("hex").slice(0, 10);
            this.pending[hash] = text;

            await ctx.send(text, {
                keyboard: Util.createKeyboard([
                    [{ text: "✅Отправить", command: `admin notify ${hash}:1` }],
                    [{ text: "❌Отмена", command: `admin notify ${hash}:0` }],
                ]),
            });
        });

        this.permission = (ctx) => ctx.senderId == module.bot.config.tg.owner;
    }
}
