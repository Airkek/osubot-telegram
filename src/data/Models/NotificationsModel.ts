import Database from "../Database";

interface Counter {
    count: number;
}

interface IdValue {
    id: number;
}

export class NotificationsModel {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getChatCountForNotifications(): Promise<number> {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT utc.chat_id) AS count
         FROM users_to_chat utc
            LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
         WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return result.count;
    }

    async getUserCountForNotifications(): Promise<number> {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT u.id) AS count
         FROM users u
            LEFT JOIN settings cs ON u.id = cs.user_id
         WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return result.count;
    }

    async getChatsForNotifications(): Promise<number[]> {
        const chats = await this.db.all<IdValue>(
            `SELECT DISTINCT utc.chat_id as id
             FROM users_to_chat utc
                LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
             WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return chats.map((chat) => chat.id);
    }

    async getUsersForNotifications(): Promise<number[]> {
        const users = await this.db.all<IdValue>(
            `SELECT DISTINCT u.id
             FROM users u
                LEFT JOIN settings cs ON u.id = cs.user_id
             WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return users.map((user) => user.id);
    }
}
