import { IApplicationStorage } from "core/storage/IApplicationStorage";
import { IPlatformStorageHost } from "core/storage/IPlatformStorageHost";

export function isPlatformStorageHost(storage: IApplicationStorage): storage is IPlatformStorageHost {
    return "forPlatform" in storage && "runWithPlatform" in storage;
}
