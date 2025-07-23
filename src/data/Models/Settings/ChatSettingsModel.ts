import Database from "../../Database";
import { LanguageOverride } from "./SettingsTypes";

export interface ChatSettings {
    chat_id: number;
    render_enabled: boolean;
    notifications_enabled: boolean;
    language_override: LanguageOverride;
}

export class ChatSettingsModel {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getChatSettings(id: number): Promise<ChatSettings | null> {
        const res = await this.db.get<ChatSettings>("SELECT * FROM chat_settings WHERE chat_id = $1", [id]);
        if (!res) {
            await this.db.run("INSERT INTO chat_settings (chat_id) VALUES ($1)", [id]);
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
