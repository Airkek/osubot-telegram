import { IBotIdentity } from "core/storage/IBotIdentity";
import { ICommandEvent } from "core/storage/ICommandEvent";
import { IEventContext } from "core/storage/IEventContext";

export interface ITelemetrySink {
    logUserCount(): Promise<void>;
    logChatCount(): Promise<void>;
    logBeatmapMetadataCacheCount(): Promise<void>;
    logRenderStart(context: IEventContext, mode: number, isExperimental: boolean): Promise<unknown>;
    logRenderSuccess(context: IEventContext, mode: number, isExperimental: boolean): Promise<unknown>;
    logRenderFailed(
        context: IEventContext,
        mode: number,
        errorMessage: string,
        isExperimental: boolean
    ): Promise<unknown>;
    logMessage(context: IEventContext): Promise<unknown>;
    logCommand(command: ICommandEvent, context: IEventContext): Promise<void>;
    logStartup(identity: IBotIdentity): Promise<void>;
}
