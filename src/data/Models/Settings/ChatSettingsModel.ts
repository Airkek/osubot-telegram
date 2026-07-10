import { ChatSettings } from "../../../core/Settings";
import { SqlExecutor } from "../../SqlExecutor";

export { ChatSettings } from "../../../core/Settings";

export class ChatSettingsModel {
    private db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async getChatSettings(id: number): Promise<ChatSettings | null> {
        const res = await this.db.get<ChatSettings>(
            `SELECT platform_chat_id AS chat_id,
                    render_enabled,
                    notifications_enabled,
                    language_override
             FROM chat_settings
             WHERE platform_chat_id = $1`,
            [id]
        );
        if (!res) {
            await this.db.run(
                `INSERT INTO chat_settings (platform_chat_id)
                 VALUES ($1)
                 ON CONFLICT (platform_chat_id) DO NOTHING`,
                [id]
            );
            return await this.getChatSettings(id);
        }
        return { ...res, chat_id: Number(res.chat_id) };
    }

    async updateSettings(settings: ChatSettings): Promise<void> {
        await this.db.run(
            `UPDATE chat_settings
             SET render_enabled        = $1,
                 notifications_enabled = $2,
                 language_override     = $3
             WHERE platform_chat_id = $4`,
            [settings.render_enabled, settings.notifications_enabled, settings.language_override, settings.chat_id]
        );
    }
}
