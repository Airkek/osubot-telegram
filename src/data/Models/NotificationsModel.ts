import { ExternalId, externalIdFromStorage, Platform } from "../../core/Identity";
import { SqlExecutor } from "../SqlExecutor";

interface Counter {
    count: number;
}

interface IdValue {
    id: string;
}

export class NotificationsModel {
    constructor(
        private readonly db: SqlExecutor,
        private readonly platform: Platform
    ) {}

    async getChatCountForNotifications(): Promise<number> {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT membership.platform_chat_id)::INT AS count
             FROM users_to_chat AS membership
             JOIN platform_chats AS chat
               ON chat.id = membership.platform_chat_id
              AND chat.platform = $1
             LEFT JOIN chat_settings AS settings
               ON settings.platform_chat_id = membership.platform_chat_id
             WHERE COALESCE(settings.notifications_enabled, true)`,
            [this.platform]
        );
        return result.count;
    }

    async getUserCountForNotifications(): Promise<number> {
        const result = await this.db.get<Counter>(
            `SELECT COUNT(DISTINCT account.id)::INT AS count
             FROM users AS game_link
             JOIN platform_accounts AS account
               ON account.user_id = game_link.app_user_id
              AND account.platform = $1
             LEFT JOIN platform_account_settings AS settings
               ON settings.platform_account_id = account.id
             WHERE COALESCE(settings.notifications_enabled, true)`,
            [this.platform]
        );
        return result.count;
    }

    async getChatsForNotifications(): Promise<ExternalId[]> {
        const chats = await this.db.all<IdValue>(
            `SELECT DISTINCT chat.external_id AS id
             FROM users_to_chat AS membership
             JOIN platform_chats AS chat
               ON chat.id = membership.platform_chat_id
              AND chat.platform = $1
             LEFT JOIN chat_settings AS settings
               ON settings.platform_chat_id = membership.platform_chat_id
             WHERE COALESCE(settings.notifications_enabled, true)`,
            [this.platform]
        );
        return chats.map((chat) => externalIdFromStorage(chat.id));
    }

    async getUsersForNotifications(): Promise<ExternalId[]> {
        const users = await this.db.all<IdValue>(
            `SELECT DISTINCT account.external_id AS id
             FROM users AS game_link
             JOIN platform_accounts AS account
               ON account.user_id = game_link.app_user_id
              AND account.platform = $1
             LEFT JOIN platform_account_settings AS settings
               ON settings.platform_account_id = account.id
             WHERE COALESCE(settings.notifications_enabled, true)`,
            [this.platform]
        );
        return users.map((user) => externalIdFromStorage(user.id));
    }
}
