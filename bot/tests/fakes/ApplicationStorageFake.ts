import { GameServerName } from "../../src/core/storage/GameServerName";
import { IApplicationStorage } from "../../src/core/storage/IApplicationStorage";
import { IChatMembershipRepository } from "../../src/core/storage/IChatMembershipRepository";
import { IErrorStore } from "../../src/core/storage/IErrorStore";
import { IFeatureFlags } from "../../src/core/storage/IFeatureFlags";
import { IGameUserRepository } from "../../src/core/storage/IGameUserRepository";
import { IIgnoredUsersRepository } from "../../src/core/storage/IIgnoredUsersRepository";
import { IMaintenanceRepository } from "../../src/core/storage/IMaintenanceRepository";
import { IMediaReferenceCache } from "../../src/core/storage/IMediaReferenceCache";
import { INotificationAudience } from "../../src/core/storage/INotificationAudience";
import { IOnboardingRepository } from "../../src/core/storage/IOnboardingRepository";
import { ITelemetrySink } from "../../src/core/storage/ITelemetrySink";
import { IUserDirectory } from "../../src/core/storage/IUserDirectory";
import { IUserRemovalRepository } from "../../src/core/storage/IUserRemovalRepository";
import { IIdentityRepository } from "../../src/core/IIdentityRepository";
import { normalizeExternalId } from "../../src/core/ExternalId";
function createGameServer(): IGameUserRepository {
    return {
        getUser: async () => null,
        findByUserId: async () => [],
        setNickname: async () => {},
        setMode: async () => false,
        updateInfo: async () => {},
        getUserStats: async () => null,
    };
}

const gameServers = (): Record<GameServerName, IGameUserRepository> => ({
    bancho: createGameServer(),
    gatari: createGameServer(),
    ripple: createGameServer(),
    akatsuki: createGameServer(),
    beatleader: createGameServer(),
    scoresaber: createGameServer(),
});

const errors = (): IErrorStore => ({
    addError: async () => "test-error",
    getError: async () => null,
    clear: async () => {},
});

const memberships = (): IChatMembershipRepository => ({
    userJoined: async () => {},
    userLeft: async () => {},
    getChatUsers: async () => [],
    removeChat: async () => {},
    getChats: async () => [],
    getChatCount: async () => 0,
    isUserInChat: async () => false,
});

const ignoredUsers = (): IIgnoredUsersRepository => ({
    getIgnoredUsers: async () => [],
    ignoreUser: async () => {},
    unignoreUser: async () => {},
});

const userRemoval = (): IUserRemovalRepository => ({
    dropUser: async () => {},
});

const notificationAudience = (): INotificationAudience => ({
    getChatCountForNotifications: async () => 0,
    getUserCountForNotifications: async () => 0,
    getChatsForNotifications: async () => [],
    getUsersForNotifications: async () => [],
});

const featureFlags = (): IFeatureFlags => ({
    isFeatureEnabled: async () => false,
    enableFeature: async () => {},
    disableFeature: async () => {},
    listFeatures: async () => [],
    clearCache: () => {},
});

const onboarding = (): IOnboardingRepository => ({
    getUserOnboardingVersion: async () => 0,
    isUserNeedOnboarding: async () => false,
    userOnboarded: async () => {},
    clearCache: () => {},
});

const userDirectory = (): IUserDirectory => ({
    get: async () => null,
    findByUsername: async () => null,
    set: async () => {},
});

const telemetry = (): ITelemetrySink => ({
    logUserCount: async () => {},
    logChatCount: async () => {},
    logBeatmapMetadataCacheCount: async () => {},
    logRenderStart: async () => {},
    logRenderSuccess: async () => {},
    logRenderFailed: async () => {},
    logMessage: async () => {},
    logCommand: async () => {},
    logStartup: async () => {},
});

const mediaReferences = (): IMediaReferenceCache => ({
    getPhoto: async () => null,
    storePhoto: async () => {},
});

const maintenance = (): IMaintenanceRepository => ({
    count: async () => 0,
    clear: async () => 0,
});

const identities = (): IIdentityRepository => ({
    platform: "telegram",
    findUser: async (externalId) => ({
        accountId: Number(externalId),
        userId: Number(externalId),
        platform: "telegram",
        externalId: normalizeExternalId(externalId),
    }),
    resolveUser: async (externalId) => ({
        accountId: Number(externalId),
        userId: Number(externalId),
        platform: "telegram",
        externalId: normalizeExternalId(externalId),
    }),
    getUser: async (accountId) => ({
        accountId,
        userId: accountId,
        platform: "telegram",
        externalId: String(accountId),
    }),
    findChat: async (externalId) => ({
        chatId: Number(externalId),
        platform: "telegram",
        externalId: normalizeExternalId(externalId),
    }),
    resolveChat: async (externalId) => ({
        chatId: Number(externalId),
        platform: "telegram",
        externalId: normalizeExternalId(externalId),
    }),
    getChat: async (chatId) => ({ chatId, platform: "telegram", externalId: String(chatId) }),
    getUserAccounts: async (userId) => [
        { accountId: userId, userId, platform: "telegram", externalId: String(userId) },
    ],
});

export function createTestStorage(overrides: Partial<IApplicationStorage> = {}): IApplicationStorage {
    return {
        platform: "telegram",
        identities: identities(),
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
        identityLinks: {
            createToken: async () => ({ code: "ABCDE-FGHJK", expiresAt: new Date() }),
            consumeToken: async () => ({ status: "invalid-token" }),
        },
        maintenance: maintenance(),
        initialize: async () => {},
        close: async () => {},
        ...overrides,
    };
}
