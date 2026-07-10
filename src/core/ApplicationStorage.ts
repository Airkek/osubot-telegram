import type { OsuBeatmap } from "../beatmaps/osu/OsuBeatmap";
import type { APIUser, IDatabaseUser, IDatabaseUserStats } from "../Types";
import type { ChatSettings, UserSettings } from "./Settings";
import type { ExternalId, IdentityRepository, Platform } from "./Identity";

export type ControllableFeature = "oki-cards" | "plaintext-overrides" | "force-onboarding" | "admin-all-features";
export const ONBOARDING_VERSION = 1;

export type GameServerName = "bancho" | "gatari" | "ripple" | "akatsuki" | "beatleader" | "scoresaber";

export interface GameUserRepository {
    getUser(userId: number): Promise<IDatabaseUser | null>;
    findByUserId(id: number | string): Promise<IDatabaseUser[]>;
    setNickname(userId: number, gameUserId: number | string, nickname: string, mode?: number): Promise<void>;
    setMode(userId: number, mode: number): Promise<boolean>;
    updateInfo(user: APIUser, mode: number): Promise<void>;
    getUserStats(userId: number, mode: number): Promise<IDatabaseUserStats | null>;
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
    account_id: number;
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
    platform: Platform;
    senderId: number;
    plainPayload?: string;
    plainText?: string;
    replyMessage?: { senderId?: number };
}

export interface EventContext {
    platform: Platform;
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
    id: ExternalId;
    username?: string;
    first_name: string;
    last_name?: string;
}

export interface IgnoredUsersRepository {
    getIgnoredUsers(): Promise<number[]>;
    ignoreUser(accountId: number): Promise<void>;
    unignoreUser(accountId: number): Promise<void>;
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
    userJoined(accountId: number, chatId: number): Promise<void>;
    userLeft(accountId: number, chatId: number): Promise<void>;
    getChatUsers(chatId: number): Promise<number[]>;
    removeChat(chatId: number): Promise<void>;
    getChats(): Promise<number[]>;
    getChatCount(): Promise<number>;
    isUserInChat(accountId: number, chatId: number): Promise<boolean>;
}

export interface UserSettingsRepository {
    getUserSettings(userId: number, accountId: number): Promise<UserSettings | null>;
    updateSettings(settings: UserSettings): Promise<void>;
}

export interface ChatSettingsRepository {
    getChatSettings(chatId: number): Promise<ChatSettings | null>;
    updateSettings(settings: ChatSettings): Promise<void>;
}

export interface NotificationAudience {
    getChatCountForNotifications(): Promise<number>;
    getUserCountForNotifications(): Promise<number>;
    getChatsForNotifications(): Promise<ExternalId[]>;
    getUsersForNotifications(): Promise<ExternalId[]>;
}

export interface FeatureFlags {
    isFeatureEnabled(feature: ControllableFeature): Promise<boolean>;
    enableFeature(feature: ControllableFeature): Promise<void>;
    disableFeature(feature: ControllableFeature): Promise<void>;
    listFeatures(): Promise<FeatureStatus[]>;
    clearCache(): void;
}

export interface OnboardingRepository {
    getUserOnboardingVersion(accountId: number): Promise<number>;
    isUserNeedOnboarding(accountId: number): Promise<boolean>;
    userOnboarded(accountId: number, version: number): Promise<void>;
    clearCache(): void;
}

export interface BeatmapCacheRepository {
    getBeatmapById(id: number): Promise<BeatmapMetadata | null>;
    getBeatmapByHash(hash: string): Promise<BeatmapMetadata | null>;
    addToCache(beatmap: OsuBeatmap): Promise<void>;
}

export interface UserDirectory {
    get(accountId: number): Promise<ExtendedUserInfo | null>;
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
    getPhoto(url: string): Promise<string | null>;
    storePhoto(url: string, attachment: string): Promise<void>;
}

export interface IdentityLinkToken {
    code: string;
    expiresAt: Date;
}

export type IdentityLinkResult =
    | { status: "linked"; userId: number; platforms: Platform[] }
    | { status: "already-linked"; userId: number; platforms: Platform[] }
    | { status: "invalid-token" }
    | { status: "same-account" }
    | { status: "platform-conflict"; platforms: Platform[] };

export interface IdentityLinkRepository {
    createToken(accountId: number): Promise<IdentityLinkToken>;
    consumeToken(accountId: number, code: string): Promise<IdentityLinkResult>;
}

export type MaintenanceTarget = "beatmapMetadata" | "covers" | "photos" | "gameLinks" | "gameStats";

export interface MaintenanceRepository {
    count(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
    clear(target: MaintenanceTarget, server?: GameServerName): Promise<number>;
}

export interface ApplicationStorage {
    readonly platform: Platform;
    readonly identities: IdentityRepository;
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
    readonly identityLinks: IdentityLinkRepository;
    readonly maintenance: MaintenanceRepository;

    initialize(): Promise<void>;
    close(): Promise<void>;
}

export interface PlatformStorageHost extends ApplicationStorage {
    readonly platforms: readonly Platform[];
    readonly currentPlatform: Platform;

    forPlatform(platform: Platform): ApplicationStorage;
    runWithPlatform<T>(platform: Platform, callback: () => Promise<T>): Promise<T>;
}

export function isPlatformStorageHost(storage: ApplicationStorage): storage is PlatformStorageHost {
    return "forPlatform" in storage && "runWithPlatform" in storage;
}
