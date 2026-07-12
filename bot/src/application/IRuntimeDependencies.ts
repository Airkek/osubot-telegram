import { ModuleBuilderFunc } from "application/ModuleBuilderFunc";
import { ExternalId } from "core/ExternalId";
import { IApplicationStorage } from "core/storage/IApplicationStorage";
import { GameApiRegistry } from "games/GameApiRegistry";
import { OsuBeatmapProvider } from "games/osu/beatmaps/OsuBeatmapProvider";
import { OsuTrackClient } from "games/osu/osutrack/OsuTrackClient";
import { PerformanceClient } from "infrastructure/performance/PerformanceClient";
import { ChatBeatmapCache } from "infrastructure/cache/ChatBeatmapCache";
import { IgnoreList } from "infrastructure/cache/IgnoreList";
import { ReplyService } from "presentation/ReplyService";
import { ITemplateStorage } from "presentation/templates/ITemplateStorage";

export interface IRuntimeDependencies {
    storage: IApplicationStorage;
    api: GameApiRegistry;
    osuBeatmapProvider: OsuBeatmapProvider;
    templates: ITemplateStorage;
    chatBeatmaps: ChatBeatmapCache;
    ignored: IgnoreList;
    track: OsuTrackClient;
    replies: ReplyService;
    sendMessage(recipientId: ExternalId, text: string): Promise<void>;
    performanceClient?: Pick<PerformanceClient, "health" | "close">;
    moduleBuilders?: ModuleBuilderFunc[];
    version?: string;
}
