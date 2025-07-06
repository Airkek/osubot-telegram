import Database from "../Database";
import { Command } from "../../telegram_event_handlers/Command";
import UnifiedMessageContext from "../../TelegramSupport";
import { UserFromGetMe } from "@grammyjs/types";
import { RenderSettings } from "../../osu_specific/replay_render/IReplayRenderer";

type RenderEvents = "render_start" | "render_success" | "render_failed";

type StatsEventType = "new_message" | "command_used" | "bot_startup" | RenderEvents;

export class StatisticsModel {
    private readonly db: Database;

    constructor(db: Database) {
        this.db = db;
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
