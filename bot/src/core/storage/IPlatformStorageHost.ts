import { IApplicationStorage } from "core/storage/IApplicationStorage";
import { Platform } from "core/Platform";

export interface IPlatformStorageHost extends IApplicationStorage {
    readonly platforms: readonly Platform[];
    readonly currentPlatform: Platform;

    forPlatform(platform: Platform): IApplicationStorage;
    runWithPlatform<T>(platform: Platform, callback: () => Promise<T>): Promise<T>;
}
