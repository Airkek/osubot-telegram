import { ExternalId } from "core/ExternalId";

export interface INotificationAudience {
    getChatCountForNotifications(): Promise<number>;
    getUserCountForNotifications(): Promise<number>;
    getChatsForNotifications(): Promise<ExternalId[]>;
    getUsersForNotifications(): Promise<ExternalId[]>;
}
