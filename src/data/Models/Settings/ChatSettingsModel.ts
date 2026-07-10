import { ChatSettings } from "../../../core/Settings";
import { SqlExecutor } from "../../SqlExecutor";

export { ChatSettings } from "../../../core/Settings";

export class ChatSettingsModel {
    private db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async getChatSettings(id: number): Promise<ChatSettings | null> {
        const res = await this.db.get<ChatSettings>("SELECT * FROM chat_settings WHERE chat_id = $1", [id]);
        if (!res) {
            await this.db.run("INSERT INTO chat_settings (chat_id) VALUES ($1) ON CONFLICT (chat_id) DO NOTHING", [id]);
            return await this.getChatSettings(id);
        }
        return res;
    }

    async updateSettings(settings: ChatSettings): Promise<void> {
        await this.db.run(
            `UPDATE chat_settings
             SET render_enabled        = $1,
                 notifications_enabled = $2,
                 language_override     = $3
             WHERE chat_id = $4`,
            [settings.render_enabled, settings.notifications_enabled, settings.language_override, settings.chat_id]
        );
    }
}
