import { IChatSettings } from "core/IChatSettings";

export interface IChatSettingsRepository {
    getChatSettings(chatId: number): Promise<IChatSettings | null>;
    updateSettings(settings: IChatSettings): Promise<void>;
    isTopicEnabled(chatId: number, topicId: number): Promise<boolean>;
    getDisabledTopicIds(chatId: number): Promise<number[]>;
    setTopicEnabled(chatId: number, topicId: number, enabled: boolean): Promise<void>;
}
