import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { IChatSettings } from "core/IChatSettings";

export { IChatSettings } from "core/IChatSettings";

export class ChatSettingsModel {
    private db: ISqlExecutor;

    constructor(db: ISqlExecutor) {
        this.db = db;
    }

    async getChatSettings(id: number): Promise<IChatSettings | null> {
        const res = await this.db.get<IChatSettings>(
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

    async updateSettings(settings: IChatSettings): Promise<void> {
        await this.db.run(
            `UPDATE chat_settings
             SET render_enabled        = $1,
                 notifications_enabled = $2,
                 language_override     = $3
             WHERE platform_chat_id = $4`,
            [settings.render_enabled, settings.notifications_enabled, settings.language_override, settings.chat_id]
        );
    }

    async isTopicEnabled(chatId: number, topicId: number): Promise<boolean> {
        const result = await this.db.get<{ enabled: boolean }>(
            `SELECT enabled
             FROM chat_topic_settings
             WHERE chat_id = $1 AND topic_id = $2`,
            [chatId, topicId]
        );
        return result?.enabled ?? true;
    }

    async getDisabledTopicIds(chatId: number): Promise<number[]> {
        const topics = await this.db.all<{ topic_id: number }>(
            `SELECT topic_id
             FROM chat_topic_settings
             WHERE chat_id = $1 AND enabled = false
             ORDER BY topic_id`,
            [chatId]
        );
        return topics.map(({ topic_id }) => Number(topic_id));
    }

    async setTopicEnabled(chatId: number, topicId: number, enabled: boolean): Promise<void> {
        if (enabled) {
            await this.db.run(
                `DELETE FROM chat_topic_settings
                 WHERE chat_id = $1 AND topic_id = $2`,
                [chatId, topicId]
            );
            return;
        }

        await this.db.run(
            `INSERT INTO chat_topic_settings (chat_id, topic_id, enabled)
             VALUES ($1, $2, false)
             ON CONFLICT (chat_id, topic_id) DO UPDATE SET enabled = false`,
            [chatId, topicId]
        );
    }
}
