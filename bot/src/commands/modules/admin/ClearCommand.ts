import { ICommandArgs } from "commands/ICommandArgs";
import { IMessageContext } from "core/IMessageContext";
import { Command } from "commands/Command";
import { IKeyboard } from "presentation/keyboard/IKeyboard";
import { IKeyboardRow } from "presentation/keyboard/IKeyboardRow";
import { makeKeyboard } from "presentation/keyboard/makeKeyboard";
import { Module } from "commands/Module";
import { GameServerName } from "core/storage/GameServerName";
import { MaintenanceTarget } from "core/storage/MaintenanceTarget";

const SERVER_OPTIONS = [
    { id: "bancho", label: "Bancho" },
    { id: "gatari", label: "Gatari" },
    { id: "ripple", label: "Ripple (+Relax)" },
    { id: "akatsuki", label: "Akatsuki (+Relax/+AP)" },
    { id: "beatleader", label: "BeatLeader" },
    { id: "scoresaber", label: "ScoreSaber" },
] as const;

type ClearTarget = "beatmapmeta" | "nick" | "images" | "stats" | "chats";
type ClearServer = GameServerName | "all";

export class ClearCommand extends Command {
    constructor(module: Module) {
        super(["clear", "сдуфк"], module, async (ctx, _self, args) => {
            await this.processClear(ctx, args);
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }

    private async processClear(ctx: IMessageContext, args: ICommandArgs) {
        const action = this.normalizeToken(args.full[0]);

        if (!action || action == "menu" || action == "start" || action == "back") {
            await this.showMainMenu(ctx);
            return;
        }

        if (action == "apply") {
            await this.applyAction(ctx, args);
            return;
        }

        const target = this.normalizeTarget(action);
        if (!target) {
            await this.showUnknownSubcommand(ctx);
            return;
        }

        if (target == "nick" || target == "stats") {
            const scopeToken = this.normalizeToken(args.full[1]);
            if (!scopeToken) {
                await this.showServerSelection(ctx, target);
                return;
            }

            const scope = this.normalizeServer(scopeToken);
            if (!scope) {
                await this.render(
                    ctx,
                    ctx.tr("admin-clear-unknown-server", { server: scopeToken }),
                    this.buildServerSelectionKeyboard(ctx, target)
                );
                return;
            }

            await this.showConfirmation(ctx, target, scope);
            return;
        }

        await this.showConfirmation(ctx, target);
    }

    private async applyAction(ctx: IMessageContext, args: ICommandArgs) {
        const target = this.normalizeTarget(this.normalizeToken(args.full[1]));
        if (!target) {
            await this.showUnknownSubcommand(ctx);
            return;
        }

        let scope: ClearServer = undefined;
        if (target == "nick" || target == "stats") {
            scope = this.normalizeServer(this.normalizeToken(args.full[2]));
            if (!scope) {
                await this.showServerSelection(ctx, target);
                return;
            }
        }

        if (ctx.messagePayload) {
            try {
                await ctx.answer(ctx.tr("admin-clear-running"));
            } catch {
                // ignore callback response errors and continue action
            }
        }

        await this.runAction(ctx, target, scope);
    }

    private async runAction(ctx: IMessageContext, target: ClearTarget, scope?: ClearServer) {
        const storage = this.module.bot.storage;

        if (target == "beatmapmeta") {
            const removed = await storage.maintenance.clear("beatmapMetadata");
            await storage.telemetry.logBeatmapMetadataCacheCount();

            await this.showResult(ctx, ctx.tr("admin-clear-beatmap-result", { removed }));
            return;
        }

        if (target == "images") {
            const coversRemoved = await storage.maintenance.clear("covers");
            const photosRemoved = await storage.maintenance.clear("photos");

            const totalRemoved = coversRemoved + photosRemoved;
            await this.showResult(
                ctx,
                ctx.tr("admin-clear-images-result", {
                    covers: coversRemoved,
                    photos: photosRemoved,
                    total: totalRemoved,
                })
            );
            return;
        }

        if (target == "nick") {
            const removed = await storage.maintenance.clear("gameLinks", scope == "all" ? undefined : scope);
            await this.showResult(
                ctx,
                ctx.tr("admin-clear-links-result", { server: this.getServerLabel(ctx, scope), removed })
            );
            return;
        }

        if (target == "stats") {
            const removed = await storage.maintenance.clear("gameStats", scope == "all" ? undefined : scope);
            await this.showResult(
                ctx,
                ctx.tr("admin-clear-stats-result", { server: this.getServerLabel(ctx, scope), removed })
            );
            return;
        }

        const chats = await storage.memberships.getChats();
        await this.render(ctx, ctx.tr("admin-clear-chats-running", { count: chats.length }));

        let removed = 0;
        for (const chatId of chats) {
            const isValid = await ctx.isBotInChat(chatId);
            if (!isValid) {
                removed++;
                await storage.memberships.removeChat(chatId);
            }
        }

        const newCount = await storage.memberships.getChatCount();
        await this.showResult(
            ctx,
            ctx.tr("admin-clear-chats-result", { before: chats.length, removed, remaining: newCount })
        );
    }

    private async showMainMenu(ctx: IMessageContext) {
        await this.render(ctx, ctx.tr("admin-clear-menu"), this.buildMainMenuKeyboard(ctx));
    }

    private async showServerSelection(ctx: IMessageContext, target: "nick" | "stats") {
        const key = target == "nick" ? "admin-clear-select-server-links" : "admin-clear-select-server-stats";
        await this.render(ctx, ctx.tr(key), this.buildServerSelectionKeyboard(ctx, target));
    }

    private async showConfirmation(ctx: IMessageContext, target: ClearTarget, scope?: ClearServer) {
        const description = this.getActionDescription(ctx, target, scope);
        const details = await this.getPreviewDetails(ctx, target, scope);

        await this.render(
            ctx,
            ctx.tr("admin-clear-confirmation", { description, details }),
            this.buildConfirmKeyboard(ctx, target, scope)
        );
    }

    private async showUnknownSubcommand(ctx: IMessageContext) {
        await this.render(ctx, ctx.tr("admin-clear-unknown-action"), this.buildMainMenuKeyboard(ctx));
    }

    private async showResult(ctx: IMessageContext, text: string) {
        await this.render(ctx, text, [[{ text: ctx.tr("admin-clear-button-menu"), command: "admin clear" }]]);
    }

    private buildMainMenuKeyboard(ctx: IMessageContext): IKeyboard {
        return [
            [{ text: ctx.tr("admin-clear-button-beatmaps"), command: "admin clear beatmapmeta" }],
            [{ text: ctx.tr("admin-clear-button-links"), command: "admin clear nick" }],
            [{ text: ctx.tr("admin-clear-button-images"), command: "admin clear images" }],
            [{ text: ctx.tr("admin-clear-button-stats"), command: "admin clear stats" }],
            [{ text: ctx.tr("admin-clear-button-chats"), command: "admin clear clearchats" }],
        ];
    }

    private buildServerSelectionKeyboard(ctx: IMessageContext, target: "nick" | "stats"): IKeyboard {
        const keyboard: IKeyboardRow[] = [];

        for (let i = 0; i < SERVER_OPTIONS.length; i += 2) {
            const row = SERVER_OPTIONS.slice(i, i + 2).map((server) => ({
                text: server.label,
                command: `admin clear ${target} ${server.id}`,
            }));
            keyboard.push(row);
        }

        keyboard.push([{ text: ctx.tr("admin-clear-button-all-servers"), command: `admin clear ${target} all` }]);
        keyboard.push([{ text: ctx.tr("admin-clear-button-back"), command: "admin clear" }]);

        return makeKeyboard(keyboard);
    }

    private buildConfirmKeyboard(ctx: IMessageContext, target: ClearTarget, scope?: ClearServer): IKeyboard {
        const applyCommand = scope ? `admin clear apply ${target} ${scope}` : `admin clear apply ${target}`;
        const backCommand = target == "nick" || target == "stats" ? `admin clear ${target}` : "admin clear";

        return [
            [{ text: ctx.tr("admin-clear-button-confirm"), command: applyCommand }],
            [{ text: ctx.tr("admin-clear-button-back"), command: backCommand }],
        ];
    }

    private getActionDescription(ctx: IMessageContext, target: ClearTarget, scope?: ClearServer): string {
        if (target == "beatmapmeta") {
            return ctx.tr("admin-clear-description-beatmaps");
        }
        if (target == "images") {
            return ctx.tr("admin-clear-description-images");
        }
        if (target == "chats") {
            return ctx.tr("admin-clear-description-chats");
        }
        if (target == "nick") {
            return ctx.tr("admin-clear-description-links", { server: this.getServerLabel(ctx, scope) });
        }
        return ctx.tr("admin-clear-description-stats", { server: this.getServerLabel(ctx, scope) });
    }

    private async getPreviewDetails(ctx: IMessageContext, target: ClearTarget, scope?: ClearServer): Promise<string> {
        if (target == "beatmapmeta") {
            const count = await this.module.bot.storage.maintenance.count("beatmapMetadata");
            return ctx.tr("admin-clear-preview-beatmaps", { count });
        }

        if (target == "images") {
            const covers = await this.module.bot.storage.maintenance.count("covers");
            const photos = await this.module.bot.storage.maintenance.count("photos");
            return ctx.tr("admin-clear-preview-images", { covers, photos });
        }

        if (target == "chats") {
            const count = await this.module.bot.storage.memberships.getChatCount();
            return ctx.tr("admin-clear-preview-chats", { count });
        }

        const realScope = scope == "all" ? undefined : scope;
        const maintenanceTarget: MaintenanceTarget = target == "nick" ? "gameLinks" : "gameStats";
        const count = await this.module.bot.storage.maintenance.count(maintenanceTarget, realScope);
        return ctx.tr("admin-clear-preview-rows", { count });
    }

    private normalizeTarget(token: string): ClearTarget | null {
        if (["beatmapmeta", "beatmap-metadata", "beatmapmetadata", "beatmap"].includes(token)) {
            return "beatmapmeta";
        }
        if (["nick", "nicks", "bindings", "nicknames"].includes(token)) {
            return "nick";
        }
        if (["images", "image", "img", "pics", "photos", "covers"].includes(token)) {
            return "images";
        }
        if (["stats", "stat", "cachedstats"].includes(token)) {
            return "stats";
        }
        if (["chats", "chat", "clearchats"].includes(token)) {
            return "chats";
        }

        return null;
    }

    private normalizeServer(token: string): ClearServer | null {
        if (!token) {
            return null;
        }

        if (["all", "*", "все"].includes(token)) {
            return "all";
        }

        if (["bancho", "osu"].includes(token)) {
            return "bancho";
        }
        if (["gatari"].includes(token)) {
            return "gatari";
        }
        if (["ripple", "ripplerx", "rx"].includes(token)) {
            return "ripple";
        }
        if (["akatsuki", "akatsukirx", "akatsukiap", "ax", "ap"].includes(token)) {
            return "akatsuki";
        }
        if (["beatleader", "bl"].includes(token)) {
            return "beatleader";
        }
        if (["scoresaber", "ss"].includes(token)) {
            return "scoresaber";
        }

        return null;
    }

    private getServerLabel(ctx: IMessageContext, scope: ClearServer): string {
        if (scope == "all") {
            return ctx.tr("admin-clear-all-servers");
        }

        const found = SERVER_OPTIONS.find((server) => server.id == scope);
        return found?.label ?? scope;
    }

    private normalizeToken(token?: string): string {
        return token?.toLowerCase().trim() ?? "";
    }

    private async render(ctx: IMessageContext, text: string, keyboard?: IKeyboard) {
        if (!ctx.messagePayload) {
            await ctx.reply(text, { keyboard });
            return;
        }

        try {
            await ctx.edit(text, { keyboard });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            if (message.includes("message is not modified")) {
                await ctx.answer(ctx.tr("admin-clear-no-changes"));
                return;
            }
            throw e;
        }
    }
}
