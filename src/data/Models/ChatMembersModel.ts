import Database from "../Database";

interface UsersToChat {
    user_id: number;
    chat_id: number;
}

interface UsersToChatCount {
    count: number;
}

export class ChatMembersModel {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async userJoined(userId: number, chatId: number): Promise<void> {
        await this.db.run("INSERT INTO users_to_chat (user_id, chat_id) VALUES ($1, $2)", [userId, chatId]);
    }

    async userLeft(userId: number, chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE user_id = $1 AND chat_id = $2", [userId, chatId]);
    }

    async getChatUsers(chatId: number): Promise<number[]> {
        const users = await this.db.all<UsersToChat>("SELECT * FROM users_to_chat WHERE chat_id = $1", [chatId]);
        return users.map((u) => u.user_id);
    }

    async removeChat(chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE chat_id = $1", [chatId]);
    }

    async getChats(): Promise<number[]> {
        const chats = await this.db.all<UsersToChat>("SELECT DISTINCT chat_id FROM users_to_chat");
        return chats.map((chat) => chat.chat_id);
    }

    async getChatCount(): Promise<number> {
        const result = await this.db.get<UsersToChatCount>(
            "SELECT COUNT(DISTINCT chat_id) AS count FROM users_to_chat"
        );
        return result.count;
    }

    async isUserInChat(userId: number, chatId: number): Promise<boolean> {
        const user = await this.db.get<UsersToChat>("SELECT * FROM users_to_chat WHERE user_id = $1 AND chat_id = $2", [
            userId,
            chatId,
        ]);
        return !!user;
    }
}
