import type { ApplicationRuntime, RuntimePlatformServices } from "./ApplicationRuntime";
import type { BotIdentity } from "./ApplicationStorage";

export interface PlatformAdapter extends RuntimePlatformServices {
    start(runtime: ApplicationRuntime): Promise<BotIdentity>;
    stop(): Promise<void>;
    getPublicLink(identity: BotIdentity): string;
}
