import { IUserSettings } from "core/IUserSettings";

export interface IUserSettingsRepository {
    getUserSettings(userId: number, accountId: number): Promise<IUserSettings | null>;
    updateSettings(settings: IUserSettings): Promise<void>;
}
