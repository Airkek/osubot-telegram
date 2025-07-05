import Database from "../Database";

export class NotificationsModel {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getChatCountForNotifications(): Promise<number> {
        const result = await this.db.get(
            `SELECT COUNT(DISTINCT utc.chat_id) AS count
         FROM users_to_chat utc
            LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
         WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return result.count;
    }

    async getUserCountForNotifications(): Promise<number> {
        const result = await this.db.get(
            `SELECT COUNT(DISTINCT u.id) AS count
         FROM users u
            LEFT JOIN settings cs ON u.id = cs.user_id
         WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return result.count;
    }

    async getChatsForNotifications(): Promise<number[]> {
        const chats = await this.db.all(
            `SELECT DISTINCT utc.chat_id
             FROM users_to_chat utc
                LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
             WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return chats.map((chat) => chat.chat_id);
    }

    async getUsersForNotifications(): Promise<number[]> {
        const users = await this.db.all(
            `SELECT DISTINCT u.id
             FROM users u
                LEFT JOIN settings cs ON u.id = cs.user_id
             WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return users.map((user) => user.id);
    }
}
