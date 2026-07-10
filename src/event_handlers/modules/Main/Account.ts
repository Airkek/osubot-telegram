import { Command } from "../../Command";
import { Module } from "../Module";

const platformNames = (platforms: string[]): string =>
    platforms
        .map((platform) => {
            if (platform === "telegram") return "Telegram";
            if (platform === "vk") return "VK";
            return platform;
        })
        .join(", ");

const platformLinks = (links: readonly { platform: string; url: string }[]): string =>
    links.map((link) => `${platformNames([link.platform])}: ${link.url}`).join("\n");

export default class AccountCommand extends Command {
    constructor(module: Module) {
        super(["account", "identity", "аккаунт"], module, async (ctx, self, args) => {
            if (ctx.isInGroupChat) {
                await ctx.reply(ctx.tr("identity-link-private-only"));
                return;
            }

            const code = args.fullString.trim();
            if (!code) {
                const token = await self.module.bot.storage.identityLinks.createToken(ctx.senderId);
                await ctx.reply(
                    ctx.tr("identity-link-code", {
                        code: token.code,
                        minutes: Math.max(1, Math.ceil((token.expiresAt.getTime() - Date.now()) / 60_000)),
                        bot_links: platformLinks(self.module.bot.platformBotLinks),
                    })
                );
                return;
            }

            const result = await self.module.bot.storage.identityLinks.consumeToken(ctx.senderId, code);
            switch (result.status) {
                case "linked":
                    await ctx.reply(
                        ctx.tr("identity-link-success", {
                            platforms: platformNames(result.platforms),
                        })
                    );
                    return;
                case "already-linked":
                    await ctx.reply(
                        ctx.tr("identity-link-already-linked", {
                            platforms: platformNames(result.platforms),
                        })
                    );
                    return;
                case "platform-conflict":
                    await ctx.reply(
                        ctx.tr("identity-link-platform-conflict", {
                            platforms: platformNames(result.platforms),
                        })
                    );
                    return;
                case "same-account":
                    await ctx.reply(ctx.tr("identity-link-same-account"));
                    return;
                case "invalid-token":
                    await ctx.reply(ctx.tr("identity-link-invalid-token"));
                    return;
            }
        });
    }
}
