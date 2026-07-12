import { IUserInfo } from "core/storage/IUserInfo";

export interface IExtendedUserInfo extends IUserInfo {
    username?: string | null;
}
