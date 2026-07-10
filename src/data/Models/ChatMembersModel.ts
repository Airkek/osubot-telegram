import { SqlExecutor } from "../SqlExecutor";
import { Platform } from "../../core/Identity";

interface UsersToChat {
    platform_account_id: number;
    platform_chat_id: number;
}

interface UsersToChatCount {
    count: number;
}

export class ChatMembersModel {
    db: SqlExecutor;

    constructor(
        db: SqlExecutor,
        private readonly platform: Platform
    ) {
        this.db = db;
    }

    async userJoined(accountId: number, chatId: number): Promise<void> {
        await this.db.run(
            `INSERT INTO users_to_chat (platform_account_id, platform_chat_id)
             VALUES ($1, $2)
             ON CONFLICT (platform_account_id, platform_chat_id) DO NOTHING`,
            [accountId, chatId]
        );
    }

    async userLeft(accountId: number, chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE platform_account_id = $1 AND platform_chat_id = $2", [
            accountId,
            chatId,
        ]);
    }

    async getChatUsers(chatId: number): Promise<number[]> {
        const users = await this.db.all<UsersToChat>(
            "SELECT platform_account_id FROM users_to_chat WHERE platform_chat_id = $1",
            [chatId]
        );
        return users.map((u) => Number(u.platform_account_id));
    }

    async removeChat(chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE platform_chat_id = $1", [chatId]);
    }

    async getChats(): Promise<number[]> {
        const chats = await this.db.all<UsersToChat>(
            `SELECT DISTINCT membership.platform_chat_id
             FROM users_to_chat AS membership
             JOIN platform_chats AS chat
               ON chat.id = membership.platform_chat_id
              AND chat.platform = $1`,
            [this.platform]
        );
        return chats.map((chat) => Number(chat.platform_chat_id));
    }

    async getChatCount(): Promise<number> {
        const result = await this.db.get<UsersToChatCount>(
            `SELECT COUNT(DISTINCT membership.platform_chat_id)::INT AS count
             FROM users_to_chat AS membership
             JOIN platform_chats AS chat
               ON chat.id = membership.platform_chat_id
              AND chat.platform = $1`,
            [this.platform]
        );
        return result.count;
    }

    async isUserInChat(accountId: number, chatId: number): Promise<boolean> {
        const user = await this.db.get<UsersToChat>(
            "SELECT platform_account_id FROM users_to_chat WHERE platform_account_id = $1 AND platform_chat_id = $2",
            [accountId, chatId]
        );
        return !!user;
    }
}
