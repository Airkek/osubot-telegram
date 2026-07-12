import { IChatSettings } from "core/IChatSettings";

export interface IChatSettingsRepository {
    getChatSettings(chatId: number): Promise<IChatSettings | null>;
    updateSettings(settings: IChatSettings): Promise<void>;
}
