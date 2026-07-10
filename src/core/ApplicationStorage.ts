import type { OsuBeatmap } from "../beatmaps/osu/OsuBeatmap";
import type { APIUser, IDatabaseUser, IDatabaseUserStats } from "../Types";
import type { ChatSettings, UserSettings } from "./Settings";

export type ControllableFeature = "oki-cards" | "plaintext-overrides" | "force-onboarding" | "admin-all-features";
export const ONBOARDING_VERSION = 1;

export type GameServerName = "bancho" | "gatari" | "ripple" | "akatsuki" | "beatleader" | "scoresaber";

export interface GameUserRepository {
    getUser(id: number): Promise<IDatabaseUser | null>;
    findByUserId(id: number | string): Promise<IDatabaseUser[]>;
    setNickname(id: number, gameUserId: number | string, nickname: string, mode?: number): Promise<void>;
    setMode(id: number, mode: number): Promise<boolean>;
    updateInfo(user: APIUser, mode: number): Promise<void>;
    getUserStats(id: number, mode: number): Promise<IDatabaseUserStats | null>;
}

export interface FeatureStatus {
    feature: ControllableFeature;
    enabled_for_all: boolean;
}

export interface BeatmapMetadata {
    id: number;
    set_id: number;
    hash: string;
    title: string;
    artist: string;
    version: string;
    author: string;
    author_id: number;
    status: string;
    native_mode: number;
    native_length: number;
    cover_url: string;
}

export interface UserInfo {
    user_id: number;
    display_username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export interface ExtendedUserInfo extends UserInfo {
    username?: string | null;
}

export interface StoredError {
    code: string;
    info: string;
    error: string;
}

export interface ErrorContext {
    senderId: number;
    plainPayload?: string;
    plainText?: string;
    replyMessage?: { senderId: number };
}

export interface EventContext {
    senderId: number;
    chatId: number;
    plainPayload?: string;
    plainText?: string;
}

export interface CommandEvent {
    name: string;
    module: { name: string };
}

export interface BotIdentity {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
}

export interface IgnoredUsersRepository {
    getIgnoredUsers(): Promise<number[]>;
    ignoreUser(userId: number): Promise<void>;
    unignoreUser(userId: number): Promise<void>;
}

export interface UserRemovalRepository {
    dropUser(userId: number): Promise<void>;
}

export interface ErrorStore {
    addError(context: ErrorContext, error: unknown): Promise<string>;
    getError(code: string): Promise<StoredError | null>;
    clear(): Promise<void>;
}

export interface ChatMembershipRepository {
    userJoined(userId: number, chatId: number): Promise<void>;
    userLeft(userId: number, chatId: number): Promise<void>;
    getChatUsers(chatId: number): Promise<number[]>;
    removeChat(chatId: number): Promise<void>;
    getChats(): Promise<number[]>;
    getChatCount(): Promise<number>;
    isUserInChat(userId: number, chatId: number): Promise<boolean>;
}

export interface UserSettingsRepository {
    getUserSettings(userId: number): Promise<UserSettings | null>;
    updateSettings(settings: UserSettings): Promise<void>;
}

export interface ChatSettingsRepository {
    getChatSettings(chatId: number): Promise<ChatSettings | null>;
    updateSettings(settings: ChatSettings): Promise<void>;
}

export interface NotificationAudience {
    getChatCountForNotifications(): Promise<number>;
    getUserCountForNotifications(): Promise<number>;
    getChatsForNotifications(): Promise<number[]>;
    getUsersForNotifications(): Promise<number[]>;
}

export interface FeatureFlags {
    isFeatureEnabled(feature: ControllableFeature): Promise<boolean>;
    enableFeature(feature: ControllableFeature): Promise<void>;
    disableFeature(feature: ControllableFeature): Promise<void>;
    listFeatures(): Promise<FeatureStatus[]>;
    clearCache(): void;
}

export interface OnboardingRepository {
    getUserOnboardingVersion(userId: number): Promise<number>;
    isUserNeedOnboarding(userId: number): Promise<boolean>;
    userOnboarded(userId: number, version: number): Promise<void>;
    clearCache(): void;
}

export interface BeatmapCacheRepository {
    getBeatmapById(id: number): Promise<BeatmapMetadata | null>;
    getBeatmapByHash(hash: string): Promise<BeatmapMetadata | null>;
    addToCache(beatmap: OsuBeatmap): Promise<void>;
}

export interface UserDirectory {
    get(userId: number): Promise<ExtendedUserInfo | null>;
    findByUsername(username: string): Promise<ExtendedUserInfo | null>;
    set(info: UserInfo): Promise<void>;
}

export interface TelemetrySink {
    logUserCount(): Promise<void>;
    logChatCount(): Promise<void>;
    logBeatmapMetadataCacheCount(): Promise<void>;
    logBeatmapFilesCount(): Promise<void>;
    logRenderStart(context: EventContext, mode: number, isExperimental: boolean): Promise<unknown>;
    logRenderSuccess(context: EventContext, mode: number, isExperimental: boolean): Promise<unknown>;
    logRenderFailed(
        context: EventContext,
        mode: number,
        errorMessage: string,
        isExperimental: boolean
    ): Promise<unknown>;
    logMessage(context: EventContext): Promise<unknown>;
    logCommand(command: CommandEvent, context: EventContext): Promise<void>;
    logStartup(identity: BotIdentity): Promise<void>;
}

export interface MediaReferenceCache {
    getCover(beatmapSetId: number): Promise<string | null>;
    storeCover(beatmapSetId: number, attachment: string): Promise<void>;
    getPhoto(url: string): Promise<string | null>;
    storePhoto(url: string, attachment: string): Promise<void>;
    removeEmpty(): Promise<void>;
}

export type MaintenanceTarget = "beatmapMetadata" | "covers" | "photos" | "gameLinks" | "gameStats";

export interface MaintenanceRepository {
    count(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
    clear(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
}

export interface ApplicationStorage {
    readonly gameServers: Record<GameServerName, GameUserRepository>;
    readonly errors: ErrorStore;
    readonly memberships: ChatMembershipRepository;
    readonly ignoredUsers: IgnoredUsersRepository;
    readonly userRemoval: UserRemovalRepository;
    readonly beatmaps: BeatmapCacheRepository;
    readonly userSettings: UserSettingsRepository;
    readonly chatSettings: ChatSettingsRepository;
    readonly notificationAudience: NotificationAudience;
    readonly featureFlags: FeatureFlags;
    readonly telemetry: TelemetrySink;
    readonly onboarding: OnboardingRepository;
    readonly userDirectory: UserDirectory;
    readonly mediaReferences: MediaReferenceCache;
    readonly maintenance: MaintenanceRepository;

    initialize(): Promise<void>;
    close(): Promise<void>;
}
