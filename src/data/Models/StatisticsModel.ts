import Database from "../Database";
import { Command } from "../../telegram_event_handlers/Command";
import UnifiedMessageContext from "../../TelegramSupport";
import { UserFromGetMe } from "@grammyjs/types";
import fs from "fs";

type RenderEvents = "render_start" | "render_success" | "render_failed";
type Metrics = "user_count" | "chat_count" | "cached_beatmap_files_count" | "cached_beatmap_metadata_count";
type RawEvents = "new_message";

interface Counter {
    count: number;
}

export class StatisticsModel {
    private readonly db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public async logUserCount() {
        const result = await this.db.get<Counter>("SELECT COUNT(DISTINCT id) AS count FROM users");
        if (!result.count) {
            return;
        }

        await this.logMetric("user_count", result.count);
    }

    public async logChatCount() {
        const result = await this.db.get<Counter>("SELECT COUNT(DISTINCT chat_id) AS count FROM users_to_chat");
        if (!result.count) {
            return;
        }
        await this.logMetric("chat_count", result.count);
    }

    public async logBeatmapMetadataCacheCount() {
        const result = await this.db.get<Counter>("SELECT COUNT(*) AS count FROM osu_beatmap_metadata");
        if (!result.count) {
            return;
        }
        await this.logMetric("cached_beatmap_metadata_count", result.count);
    }

    public async logBeatmapFilesCount() {
        const folderPath = "./beatmap_cache";
        try {
            const files = fs.readdirSync(folderPath);
            const count = files.length;
            await this.logMetric("cached_beatmap_files_count", count);
        } catch {
            // ignore
        }
    }

    private async logMetric(metric: Metrics, value: number, force: boolean = true) {
        if (!force) {
            const entry = await this.db.get<{ count: number }>(
                `SELECT count FROM bot_events_metrics WHERE event_type = $1 ORDER BY time DESC LIMIT 1`,
                [metric]
            );
            if (entry && entry.count == value) {
                return;
            }
        }

        await this.db.run(
            `INSERT INTO bot_events_metrics (event_type, count)
             VALUES ($1, $2)`,
            [metric, value]
        );
    }

    public async logRenderStart(ctx: UnifiedMessageContext, mode: number, isExperimental: boolean) {
        return await this.logRenderEvent("render_start", ctx, mode, isExperimental);
    }

    public async logRenderSuccess(ctx: UnifiedMessageContext, mode: number, isExperimental: boolean) {
        return await this.logRenderEvent("render_success", ctx, mode, isExperimental);
    }

    public async logRenderFailed(
        ctx: UnifiedMessageContext,
        mode: number,
        errorMessage: string,
        isExperimental: boolean
    ) {
        return await this.logRenderEvent("render_failed", ctx, mode, isExperimental, errorMessage);
    }

    public async logMessage(ctx: UnifiedMessageContext) {
        return await this.logRawEvent("new_message", ctx.senderId, ctx.chatId);
    }

    public async logCommand(command: Command, ctx: UnifiedMessageContext) {
        await this.db.run(
            `INSERT INTO bot_events_commands (user_id, chat_id, module, command, text, is_payload)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                ctx.senderId,
                ctx.chatId,
                command.module.name,
                command.name,
                ctx.plainPayload ?? ctx.plainText ?? "",
                !!ctx.plainPayload,
            ]
        );
    }

    public async logStartup(me: UserFromGetMe) {
        await this.db.run(
            `INSERT INTO bot_events_startup (bot_id, username, first_name, last_name)
             VALUES ($1, $2, $3, $4)`,
            [me.id ?? null, me.username ?? null, me.first_name ?? null, me.last_name ?? null]
        );
    }

    private async logRenderEvent(
        type: RenderEvents,
        ctx: UnifiedMessageContext,
        mode: number,
        isExperimental: boolean,
        message?: string
    ) {
        try {
            await this.db.run(
                `INSERT INTO bot_events_render (event_type, user_id, chat_id, experimental, mode, error_message)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [type, ctx.senderId, ctx.chatId, isExperimental, mode, message ?? null]
            );
        } catch (error) {
            global.logger.error("Raw event logging error:", error);
        }
    }

    private async logRawEvent(type: RawEvents, userId: number, chatId: number) {
        try {
            await this.db.run(
                `INSERT INTO bot_events (event_type, user_id, chat_id)
                 VALUES ($1, $2, $3)`,
                [type, userId, chatId]
            );
        } catch (error) {
            global.logger.error("Raw event logging error:", error);
        }
    }
}
