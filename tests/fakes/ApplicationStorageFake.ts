import {
    ApplicationStorage,
    ChatMembershipRepository,
    ErrorStore,
    FeatureFlags,
    GameServerName,
    GameUserRepository,
    IgnoredUsersRepository,
    MaintenanceRepository,
    MediaReferenceCache,
    NotificationAudience,
    OnboardingRepository,
    TelemetrySink,
    UserDirectory,
    UserRemovalRepository,
} from "../../src/core/ApplicationStorage";
function createGameServer(): GameUserRepository {
    return {
        getUser: async () => null,
        findByUserId: async () => [],
        setNickname: async () => {},
        setMode: async () => false,
        updateInfo: async () => {},
        getUserStats: async () => null,
    };
}

const gameServers = (): Record<GameServerName, GameUserRepository> => ({
    bancho: createGameServer(),
    gatari: createGameServer(),
    ripple: createGameServer(),
    akatsuki: createGameServer(),
    beatleader: createGameServer(),
    scoresaber: createGameServer(),
});

const errors = (): ErrorStore => ({
    addError: async () => "test-error",
    getError: async () => null,
    clear: async () => {},
});

const memberships = (): ChatMembershipRepository => ({
    userJoined: async () => {},
    userLeft: async () => {},
    getChatUsers: async () => [],
    removeChat: async () => {},
    getChats: async () => [],
    getChatCount: async () => 0,
    isUserInChat: async () => false,
});

const ignoredUsers = (): IgnoredUsersRepository => ({
    getIgnoredUsers: async () => [],
    ignoreUser: async () => {},
    unignoreUser: async () => {},
});

const userRemoval = (): UserRemovalRepository => ({
    dropUser: async () => {},
});

const notificationAudience = (): NotificationAudience => ({
    getChatCountForNotifications: async () => 0,
    getUserCountForNotifications: async () => 0,
    getChatsForNotifications: async () => [],
    getUsersForNotifications: async () => [],
});

const featureFlags = (): FeatureFlags => ({
    isFeatureEnabled: async () => false,
    enableFeature: async () => {},
    disableFeature: async () => {},
    listFeatures: async () => [],
    clearCache: () => {},
});

const onboarding = (): OnboardingRepository => ({
    getUserOnboardingVersion: async () => 0,
    isUserNeedOnboarding: async () => false,
    userOnboarded: async () => {},
    clearCache: () => {},
});

const userDirectory = (): UserDirectory => ({
    get: async () => null,
    findByUsername: async () => null,
    set: async () => {},
});

const telemetry = (): TelemetrySink => ({
    logUserCount: async () => {},
    logChatCount: async () => {},
    logBeatmapMetadataCacheCount: async () => {},
    logBeatmapFilesCount: async () => {},
    logRenderStart: async () => {},
    logRenderSuccess: async () => {},
    logRenderFailed: async () => {},
    logMessage: async () => {},
    logCommand: async () => {},
    logStartup: async () => {},
});

const mediaReferences = (): MediaReferenceCache => ({
    getCover: async () => null,
    storeCover: async () => {},
    getPhoto: async () => null,
    storePhoto: async () => {},
    removeEmpty: async () => {},
});

const maintenance = (): MaintenanceRepository => ({
    count: async () => 0,
    clear: async () => 0,
});

export function createTestStorage(overrides: Partial<ApplicationStorage> = {}): ApplicationStorage {
    return {
        gameServers: gameServers(),
        errors: errors(),
        memberships: memberships(),
        ignoredUsers: ignoredUsers(),
        userRemoval: userRemoval(),
        beatmaps: {
            getBeatmapById: async () => null,
            getBeatmapByHash: async () => null,
            addToCache: async () => {},
        },
        userSettings: {
            getUserSettings: async () => null,
            updateSettings: async () => {},
        },
        chatSettings: {
            getChatSettings: async () => null,
            updateSettings: async () => {},
        },
        notificationAudience: notificationAudience(),
        featureFlags: featureFlags(),
        telemetry: telemetry(),
        onboarding: onboarding(),
        userDirectory: userDirectory(),
        mediaReferences: mediaReferences(),
        maintenance: maintenance(),
        initialize: async () => {},
        close: async () => {},
        ...overrides,
    };
}
