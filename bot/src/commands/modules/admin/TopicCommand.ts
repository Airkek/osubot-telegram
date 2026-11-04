import { Command } from "commands/Command";
import { Module } from "commands/Module";

export class TopicCommand extends Command {
    constructor(module: Module) {
        super(["topic", "тема"], module, async (ctx, self, args) => {
            if (!ctx.isInGroupChat) {
                await ctx.reply(ctx.tr("command-for-chats-only"));
                return;
            }
            if (ctx.platform !== "telegram") {
                await ctx.reply(ctx.tr("admin-topic-telegram-only"));
                return;
            }
            if (!(await ctx.isSenderAdmin())) {
                await ctx.reply(ctx.tr("admin-topic-admin-required"));
                return;
            }

            const operation = args.full[0]?.toLowerCase();
            if (!operation || operation === "list" || operation === "status") {
                const disabledTopics = await self.module.bot.storage.chatSettings.getDisabledTopicIds(ctx.chatId);
                await ctx.reply(
                    ctx.tr("admin-topic-status", {
                        topic: ctx.topicId === undefined ? ctx.tr("admin-topic-unknown") : String(ctx.topicId),
                        blocked: disabledTopics.length > 0 ? disabledTopics.join(", ") : ctx.tr("admin-topic-none"),
                    })
                );
                return;
            }

            const enabled = ["allow", "on", "enable", "разрешить"].includes(operation);
            const disabled = ["deny", "off", "disable", "запретить"].includes(operation);
            if (!enabled && !disabled) {
                await ctx.reply(ctx.tr("admin-topic-usage"));
                return;
            }

            const rawTopicId = args.full[1];
            const topicId = rawTopicId === undefined ? ctx.topicId : Number(rawTopicId);
            if (topicId === undefined) {
                await ctx.reply(ctx.tr("admin-topic-id-required"));
                return;
            }
            if (!Number.isSafeInteger(topicId) || topicId < 1) {
                await ctx.reply(ctx.tr("admin-topic-invalid-id"));
                return;
            }

            await self.module.bot.storage.chatSettings.setTopicEnabled(ctx.chatId, topicId, enabled);
            await ctx.reply(
                ctx.tr("admin-topic-updated", {
                    topic: String(topicId),
                    state: ctx.tr(enabled ? "admin-topic-state-enabled" : "admin-topic-state-disabled"),
                })
            );
        });
    }
}
