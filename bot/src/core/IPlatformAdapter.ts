import type { ApplicationRuntime } from "application/ApplicationRuntime";
import type { IRuntimePlatformServices } from "application/IRuntimePlatformServices";
import { IBotIdentity } from "core/storage/IBotIdentity";

export interface IPlatformAdapter extends IRuntimePlatformServices {
    start(runtime: ApplicationRuntime): Promise<IBotIdentity>;
    stop(): Promise<void>;
    getPublicLink(identity: IBotIdentity): string;
}
