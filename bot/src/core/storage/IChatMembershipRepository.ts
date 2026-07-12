export interface IChatMembershipRepository {
    userJoined(accountId: number, chatId: number): Promise<void>;
    userLeft(accountId: number, chatId: number): Promise<void>;
    getChatUsers(chatId: number): Promise<number[]>;
    removeChat(chatId: number): Promise<void>;
    getChats(): Promise<number[]>;
    getChatCount(): Promise<number>;
    isUserInChat(accountId: number, chatId: number): Promise<boolean>;
}
