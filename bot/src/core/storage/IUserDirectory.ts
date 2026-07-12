import { IExtendedUserInfo } from "core/storage/IExtendedUserInfo";
import { IUserInfo } from "core/storage/IUserInfo";

export interface IUserDirectory {
    get(accountId: number): Promise<IExtendedUserInfo | null>;
    findByUsername(username: string): Promise<IExtendedUserInfo | null>;
    set(info: IUserInfo): Promise<void>;
}
