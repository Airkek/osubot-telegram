import Database from "../Database";
import { Command } from "../../telegram_event_handlers/Command";
import UnifiedMessageContext from "../../TelegramSupport";
import { UserFromGetMe } from "@grammyjs/types";
import { RenderSettings } from "../../osu_specific/replay_render/IReplayRenderer";
import fs from "fs";

type RenderEvents = "render_start" | "render_success" | "render_failed";
type GenericEvents = "bot_startup" | "new_message" | "command_used";
type DbGraphEvents = "user_count" | "chat_count" | "cached_beatmap_files_count" | "cached_beatmap_metadata_count";

type StatsEventType = GenericEvents | RenderEvents | DbGraphEvents;

export class StatisticsModel {
    private readonly db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public async logUserCount() {
        const result = await this.db.get("SELECT COUNT(DISTINCT id) AS count FROM users");
        if (!result.count) {
            return;
        }
        await this.logEvent("user_count", 0, 0, {
            count: ~~result.count,
        });
    }

    public async logChatCount() {
        const result = await this.db.get("SELECT COUNT(DISTINCT chat_id) AS count FROM users_to_chat");
        if (!result.count) {
            return;
        }
        await this.logEvent("chat_count", 0, 0, {
            count: ~~result.count,
        });
    }

    public async logBeatmapMetadataCacheCount() {
        const result = await this.db.get("SELECT COUNT(*) AS count FROM osu_beatmap_metadata");
        if (!result.count) {
            return;
        }
        await this.logEvent("cached_beatmap_metadata_count", 0, 0, {
            count: ~~result.count,
        });
    }

    public async logBeatmapFilesCount() {
        const folderPath = "./beatmap_cache";
        try {
            const files = fs.readdirSync(folderPath);
            const count = files.length;
            await this.logEvent("cached_beatmap_files_count", 0, 0, {
                count: count,
            });
        } catch {
            // ignore
        }
    }

    public async logRenderStart(
        ctx: UnifiedMessageContext,
        settings: RenderSettings,
        mode: number,
        isExperimental: boolean
    ) {
        return await this.logRenderStuff("render_start", ctx, settings, mode, isExperimental);
    }

    public async logRenderSuccess(
        ctx: UnifiedMessageContext,
        settings: RenderSettings,
        mode: number,
        isExperimental: boolean
    ) {
        return await this.logRenderStuff("render_success", ctx, settings, mode, isExperimental);
    }

    public async logRenderFailed(
        ctx: UnifiedMessageContext,
        settings: RenderSettings,
        mode: number,
        errorMessage: string,
        isExperimental: boolean
    ) {
        return await this.logRenderStuff("render_failed", ctx, settings, mode, isExperimental, {
            message: errorMessage,
        });
    }

    private async logRenderStuff(
        type: RenderEvents,
        ctx: UnifiedMessageContext,
        settings: RenderSettings,
        mode: number,
        isExperimental: boolean,
        additional: object = {}
    ) {
        return await this.logEvent(type, ctx.senderId, ctx.chatId, {
            experimental: isExperimental,
            settings: settings,
            mode: mode,
            ...additional,
        });
    }

    public async logStartup(me: UserFromGetMe) {
        return await this.logEvent("bot_startup", 0, 0, {
            id: me.id,
            username: me.username,
            first_name: me.first_name,
            last_name: me.last_name,
        });
    }

    public async logMessage(ctx: UnifiedMessageContext) {
        return await this.logEvent("new_message", ctx.senderId, ctx.chatId);
    }

    public async logCommand(command: Command, ctx: UnifiedMessageContext) {
        return await this.logEvent("command_used", ctx.senderId, ctx.chatId, {
            module: command.module.name,
            command: command.name,
            text: ctx.text ?? ctx.messagePayload,
            is_payload: !!ctx.messagePayload,
        });
    }

    private async logEvent(type: StatsEventType, userId: number, chatId: number, additionalInfo?: object) {
        try {
            await this.db.run(
                `INSERT INTO bot_events (event_type, user_id, chat_id, event_data)
                 VALUES ($1, $2, $3, $4)`,
                [type, userId, chatId, additionalInfo ? JSON.stringify(additionalInfo) : null]
            );
        } catch (error) {
            global.logger.error("Metrics logging error:", error);
        }
    }
}
