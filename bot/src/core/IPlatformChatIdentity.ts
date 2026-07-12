import { Platform } from "core/Platform";

export interface IPlatformChatIdentity {
    readonly chatId: number;
    readonly platform: Platform;
    readonly externalId: string;
}
