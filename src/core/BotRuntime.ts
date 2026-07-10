import type { APICollection } from "../api/APICollection";
import type { OsuBeatmapProvider } from "../beatmaps/osu/OsuBeatmapProvider";
import type { ApplicationStorage } from "./ApplicationStorage";
import type IgnoreList from "../Ignore";
import type Maps from "../Maps";
import type OsuTrackAPI from "../osu_specific/OsuTrackAPI";
import type { Module } from "../event_handlers/modules/Module";
import type { ITemplates } from "../event_handlers/templates";
import type { ReplyUtils } from "../event_handlers/utils/ReplyUtils";
import type { IMessageContext } from "./MessageContext";
import type { ExternalId, Platform } from "./Identity";

export type PendingCallback = (ctx: IMessageContext) => Promise<boolean>;

export interface PlatformBotLink {
    readonly platform: Platform;
    readonly url: string;
}

export interface BotRuntime {
    readonly storage: ApplicationStorage;
    readonly api: APICollection;
    readonly osuBeatmapProvider: OsuBeatmapProvider;
    readonly templates: ITemplates;
    readonly maps: Maps;
    readonly ignored: IgnoreList;
    readonly track: OsuTrackAPI;
    readonly replyUtils: ReplyUtils;
    readonly version: string;
    readonly startTime: number;
    readonly modules: Module[];
    readonly platformBotLinks: readonly PlatformBotLink[];

    addCallback(ctx: IMessageContext, callback: PendingCallback): string;
    removeCallback(ticket: string): void;
    sendMessage(recipientId: ExternalId, text: string): Promise<void>;
}
