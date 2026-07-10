import { BotIdentity, CommandEvent, EventContext } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";
import fs from "fs/promises";
import { Platform } from "../../core/Identity";

type RenderEvents = "render_start" | "render_success" | "render_failed";
type Metrics = "user_count" | "chat_count" | "cached_beatmap_files_count" | "cached_beatmap_metadata_count";
type RawEvents = "new_message";

interface Counter {
    count: number;
}

export class StatisticsModel {
    private readonly db: SqlExecutor;

    constructor(
        db: SqlExecutor,
        private readonly platform: Platform
    ) {
        this.db = db;
    }

    public async logUserCount() {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT game_link.app_user_id)::INT AS count
             FROM users AS game_link
             JOIN platform_accounts AS account
               ON account.user_id = game_link.app_user_id
              AND account.platform = $1`,
            [this.platform]
        );
        if (!result.count) {
            return;
        }

        await this.logMetric("user_count", result.count);
    }

    public async logChatCount() {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT membership.platform_chat_id)::INT AS count
             FROM users_to_chat AS membership
             JOIN platform_chats AS chat
               ON chat.id = membership.platform_chat_id
              AND chat.platform = $1`,
            [this.platform]
        );
        if (!result.count) {
            return;
        }
        await this.logMetric("chat_count", result.count);
    }

    public async logBeatmapMetadataCacheCount() {
        const result = await this.db.get<Counter>("SELECT COUNT(*)::INT AS count FROM osu_beatmap_metadata");
        if (!result.count) {
            return;
        }
        await this.logMetric("cached_beatmap_metadata_count", result.count);
    }

    public async logBeatmapFilesCount() {
        const folderPath = "./beatmap_cache";
        try {
            const files = await fs.readdir(folderPath);
            const count = files.length;
            await this.logMetric("cached_beatmap_files_count", count);
        } catch {
            // ignore
        }
    }

    private async logMetric(metric: Metrics, value: number, force: boolean = true) {
        if (!force) {
            const entry = await this.db.get<{ count: number }>(
                `SELECT count
                 FROM bot_events_metrics
                 WHERE event_type = $1 AND platform = $2
                 ORDER BY time DESC
                 LIMIT 1`,
                [metric, this.platform]
            );
            if (entry && entry.count == value) {
                return;
            }
        }

        await this.db.run(
            `INSERT INTO bot_events_metrics (platform, event_type, count)
             VALUES ($1, $2, $3)`,
            [this.platform, metric, value]
        );
    }

    public async logRenderStart(ctx: EventContext, mode: number, isExperimental: boolean) {
        return await this.logRenderEvent("render_start", ctx, mode, isExperimental);
    }

    public async logRenderSuccess(ctx: EventContext, mode: number, isExperimental: boolean) {
        return await this.logRenderEvent("render_success", ctx, mode, isExperimental);
    }

    public async logRenderFailed(ctx: EventContext, mode: number, errorMessage: string, isExperimental: boolean) {
        return await this.logRenderEvent("render_failed", ctx, mode, isExperimental, errorMessage);
    }

    public async logMessage(ctx: EventContext) {
        return await this.logRawEvent("new_message", ctx);
    }

    public async logCommand(command: CommandEvent, ctx: EventContext) {
        await this.db.run(
            `INSERT INTO bot_events_commands
                 (platform, platform_account_id, platform_chat_id, module, command, text, is_payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                ctx.platform,
                ctx.senderId,
                ctx.chatId,
                command.module.name,
                command.name,
                ctx.plainPayload ?? ctx.plainText ?? "",
                !!ctx.plainPayload,
            ]
        );
    }

    public async logStartup(me: BotIdentity) {
        await this.db.run(
            `INSERT INTO bot_events_startup (platform, bot_id, username, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5)`,
            [this.platform, me.id ?? null, me.username ?? null, me.first_name ?? null, me.last_name ?? null]
        );
    }

    private async logRenderEvent(
        type: RenderEvents,
        ctx: EventContext,
        mode: number,
        isExperimental: boolean,
        message?: string
    ) {
        try {
            await this.db.run(
                `INSERT INTO bot_events_render
                     (event_type, platform, platform_account_id, platform_chat_id, experimental, mode, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [type, ctx.platform, ctx.senderId, ctx.chatId, isExperimental, mode, message ?? null]
            );
        } catch (error) {
            global.logger.error("Raw event logging error:", error);
        }
    }

    private async logRawEvent(type: RawEvents, ctx: EventContext) {
        try {
            await this.db.run(
                `INSERT INTO bot_events (event_type, platform, platform_account_id, platform_chat_id)
                 VALUES ($1, $2, $3, $4)`,
                [type, ctx.platform, ctx.senderId, ctx.chatId]
            );
        } catch (error) {
            global.logger.error("Raw event logging error:", error);
        }
    }
}
