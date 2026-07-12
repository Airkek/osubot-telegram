import { Platform } from "core/Platform";

export interface IPlatformBotLink {
    readonly platform: Platform;
    readonly url: string;
}
