import { Command, ICommandArgs } from "../../Command";
import UnifiedMessageContext from "../../../TelegramSupport";
import { IKeyboard } from "../../../Util";
import { Module } from "../Module";

const SERVER_OPTIONS = [
    { id: "bancho", label: "Bancho" },
    { id: "gatari", label: "Gatari" },
    { id: "ripple", label: "Ripple (+Relax)" },
    { id: "akatsuki", label: "Akatsuki (+Relax/+AP)" },
    { id: "beatleader", label: "BeatLeader" },
    { id: "scoresaber", label: "ScoreSaber" },
] as const;

type ClearTarget = "beatmapmeta" | "nick" | "images" | "stats" | "chats";
type ClearServer = (typeof SERVER_OPTIONS)[number]["id"] | "all";

type TableName = "osu_beatmap_metadata" | "covers" | "photos" | "users" | "stats";

interface CountRow {
    count: number;
}

export default class ClearCommand extends Command {
    constructor(module: Module) {
        super(["clear", "сдуфк"], module, async (ctx, _self, args) => {
            await this.processClear(ctx, args);
        });

        this.permission = (ctx) => ctx.isFromOwner;
    }

    private async processClear(ctx: UnifiedMessageContext, args: ICommandArgs) {
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
                    `Неизвестный сервер: '${scopeToken}'. Выберите сервер через меню.`,
                    this.buildServerSelectionKeyboard(target)
                );
                return;
            }

            await this.showConfirmation(ctx, target, scope);
            return;
        }

        await this.showConfirmation(ctx, target);
    }

    private async applyAction(ctx: UnifiedMessageContext, args: ICommandArgs) {
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
                await ctx.answer("Выполняю очистку...");
            } catch {
                // ignore callback response errors and continue action
            }
        }

        await this.runAction(ctx, target, scope);
    }

    private async runAction(ctx: UnifiedMessageContext, target: ClearTarget, scope?: ClearServer) {
        const db = this.module.bot.database;

        if (target == "beatmapmeta") {
            const removed = await this.countRows("osu_beatmap_metadata");
            await db.run("DELETE FROM osu_beatmap_metadata");
            await db.statsModel.logBeatmapMetadataCacheCount();

            await this.showResult(ctx, `Кэш metadata beatmaps очищен. Удалено записей: ${removed}`);
            return;
        }

        if (target == "images") {
            const coversRemoved = await this.countRows("covers");
            const photosRemoved = await this.countRows("photos");

            await db.run("DELETE FROM covers");
            await db.run("DELETE FROM photos");

            const totalRemoved = coversRemoved + photosRemoved;
            await this.showResult(
                ctx,
                `Кэш картинок очищен.\nУдалено cover: ${coversRemoved}\nУдалено photos: ${photosRemoved}\nВсего удалено: ${totalRemoved}`
            );
            return;
        }

        if (target == "nick") {
            const removed = await this.clearServerScopedTable("users", scope);
            await this.showResult(
                ctx,
                `Привязки ников очищены (${this.getServerLabel(scope)}). Удалено записей: ${removed}`
            );
            return;
        }

        if (target == "stats") {
            const removed = await this.clearServerScopedTable("stats", scope);
            await this.showResult(
                ctx,
                `Кэш статов пользователей очищен (${this.getServerLabel(scope)}). Удалено записей: ${removed}`
            );
            return;
        }

        const chats = await db.chats.getChats();
        await this.render(ctx, `Идёт чистка чатов. Всего чатов: ${chats.length}`);

        let removed = 0;
        for (const chatId of chats) {
            const isValid = await ctx.isBotInChat(chatId);
            if (!isValid) {
                removed++;
                await db.chats.removeChat(chatId);
            }
        }

        const newCount = await db.chats.getChatCount();
        await this.showResult(
            ctx,
            `Чистка чатов выполнена.\n\nБыло чатов: ${chats.length}\nУдалено чатов: ${removed}\nОсталось чатов: ${newCount}`
        );
    }

    private async showMainMenu(ctx: UnifiedMessageContext) {
        await this.render(ctx, "Меню очистки admin clear.\nВыберите действие:", this.buildMainMenuKeyboard());
    }

    private async showServerSelection(ctx: UnifiedMessageContext, target: "nick" | "stats") {
        const title = target == "nick" ? "привязок ников" : "кэша статов";
        await this.render(ctx, `Выберите сервер для очистки ${title}:`, this.buildServerSelectionKeyboard(target));
    }

    private async showConfirmation(ctx: UnifiedMessageContext, target: ClearTarget, scope?: ClearServer) {
        const description = this.getActionDescription(target, scope);
        const details = await this.getPreviewDetails(target, scope);

        await this.render(
            ctx,
            `Подтверждение очистки ${description}.\n${details}`,
            this.buildConfirmKeyboard(target, scope)
        );
    }

    private async showUnknownSubcommand(ctx: UnifiedMessageContext) {
        await this.render(
            ctx,
            "Неизвестная подкоманда очистки. Выберите действие из меню.",
            this.buildMainMenuKeyboard()
        );
    }

    private async showResult(ctx: UnifiedMessageContext, text: string) {
        await this.render(ctx, text, [[{ text: "⬅ В меню очистки", command: "admin clear" }]]);
    }

    private buildMainMenuKeyboard(): IKeyboard {
        return [
            [{ text: "🗂 Очистить кэш beatmaps metadata", command: "admin clear beatmapmeta" }],
            [{ text: "🧷 Очистить привязки ников", command: "admin clear nick" }],
            [{ text: "🖼 Очистить кэш картинок", command: "admin clear images" }],
            [{ text: "📊 Очистить кэш статов пользователей", command: "admin clear stats" }],
            [{ text: "🧹 Очистить невалидные чаты (clearchats)", command: "admin clear clearchats" }],
        ];
    }

    private buildServerSelectionKeyboard(target: "nick" | "stats"): IKeyboard {
        const keyboard: IKeyboard = [];

        for (let i = 0; i < SERVER_OPTIONS.length; i += 2) {
            const row = SERVER_OPTIONS.slice(i, i + 2).map((server) => ({
                text: server.label,
                command: `admin clear ${target} ${server.id}`,
            }));
            keyboard.push(row);
        }

        keyboard.push([{ text: "🌐 Все сервера", command: `admin clear ${target} all` }]);
        keyboard.push([{ text: "⬅ Назад", command: "admin clear" }]);

        return keyboard;
    }

    private buildConfirmKeyboard(target: ClearTarget, scope?: ClearServer): IKeyboard {
        const applyCommand = scope ? `admin clear apply ${target} ${scope}` : `admin clear apply ${target}`;
        const backCommand = target == "nick" || target == "stats" ? `admin clear ${target}` : "admin clear";

        return [[{ text: "✅ Подтвердить", command: applyCommand }], [{ text: "⬅ Назад", command: backCommand }]];
    }

    private getActionDescription(target: ClearTarget, scope?: ClearServer): string {
        if (target == "beatmapmeta") {
            return "кэша beatmaps metadata";
        }
        if (target == "images") {
            return "кэша картинок";
        }
        if (target == "chats") {
            return "невалидных чатов";
        }
        if (target == "nick") {
            return `привязок ников (${this.getServerLabel(scope)})`;
        }
        return `кэша статов пользователей (${this.getServerLabel(scope)})`;
    }

    private async getPreviewDetails(target: ClearTarget, scope?: ClearServer): Promise<string> {
        if (target == "beatmapmeta") {
            const count = await this.countRows("osu_beatmap_metadata");
            return `Сейчас записей в кэше: ${count}`;
        }

        if (target == "images") {
            const covers = await this.countRows("covers");
            const photos = await this.countRows("photos");
            return `Сейчас в кэше: cover=${covers}, photos=${photos}`;
        }

        if (target == "chats") {
            const count = await this.module.bot.database.chats.getChatCount();
            return `Будет проверено чатов: ${count}`;
        }

        const realScope = scope == "all" ? undefined : scope;
        const table = target == "nick" ? "users" : "stats";
        const count = await this.countRows(table, realScope);
        return `Записей к удалению: ${count}`;
    }

    private async clearServerScopedTable(table: "users" | "stats", scope: ClearServer): Promise<number> {
        const db = this.module.bot.database;

        if (scope == "all") {
            const count = await this.countRows(table);
            await db.run(`DELETE FROM ${table}`);
            return count;
        }

        const count = await this.countRows(table, scope);
        await db.run(`DELETE FROM ${table} WHERE server = $1`, [scope]);
        return count;
    }

    private async countRows(table: TableName, server?: (typeof SERVER_OPTIONS)[number]["id"]): Promise<number> {
        let query = `SELECT COUNT(*)::INT AS count FROM ${table}`;
        const params: string[] = [];

        if (server) {
            query += " WHERE server = $1";
            params.push(server);
        }

        const row = await this.module.bot.database.get<CountRow>(query, params);
        return row?.count ?? 0;
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

    private getServerLabel(scope: ClearServer): string {
        if (scope == "all") {
            return "все сервера";
        }

        const found = SERVER_OPTIONS.find((server) => server.id == scope);
        return found?.label ?? scope;
    }

    private normalizeToken(token?: string): string {
        return token?.toLowerCase().trim() ?? "";
    }

    private async render(ctx: UnifiedMessageContext, text: string, keyboard?: IKeyboard) {
        if (!ctx.messagePayload) {
            await ctx.reply(text, { keyboard });
            return;
        }

        try {
            await ctx.edit(text, { keyboard });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            if (message.includes("message is not modified")) {
                await ctx.answer("Без изменений");
                return;
            }
            throw e;
        }
    }
}
