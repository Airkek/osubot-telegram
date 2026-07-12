import type { Module } from "commands/Module";
import type { ExternalId } from "core/ExternalId";
import type { IApplicationStorage } from "core/storage/IApplicationStorage";
import type { IMessageContext } from "core/IMessageContext";
import type { IPlatformBotLink } from "core/IPlatformBotLink";
import type { GameApiRegistry } from "games/GameApiRegistry";
import type { OsuBeatmapProvider } from "games/osu/beatmaps/OsuBeatmapProvider";
import type { OsuTrackClient } from "games/osu/osutrack/OsuTrackClient";
import type { ITemplateStorage } from "presentation/templates/ITemplateStorage";
import type { ReplyService } from "presentation/ReplyService";
import type { PendingCallback } from "core/PendingCallback";
import type { ChatBeatmapCache } from "infrastructure/cache/ChatBeatmapCache";
import type { IgnoreList } from "infrastructure/cache/IgnoreList";
import type { LeaderboardCache } from "infrastructure/cache/LeaderboardCache";

export interface IBotRuntime {
    readonly storage: IApplicationStorage;
    readonly api: GameApiRegistry;
    readonly osuBeatmapProvider: OsuBeatmapProvider;
    readonly templates: ITemplateStorage;
    readonly chatBeatmaps: ChatBeatmapCache;
    readonly ignored: IgnoreList;
    readonly leaderboards: LeaderboardCache;
    readonly track: OsuTrackClient;
    readonly replies: ReplyService;
    readonly version: string;
    readonly startTime: number;
    readonly modules: Module[];
    readonly platformBotLinks: readonly IPlatformBotLink[];

    addCallback(context: IMessageContext, callback: PendingCallback): string;
    removeCallback(ticket: string): void;
    sendMessage(recipientId: ExternalId, text: string): Promise<void>;
}
