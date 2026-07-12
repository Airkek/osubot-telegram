import { Platform } from "core/Platform";

export interface IPlatformAccountIdentity {
    readonly accountId: number;
    readonly userId: number;
    readonly platform: Platform;
    readonly externalId: string;
}
