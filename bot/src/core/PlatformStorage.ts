import { AsyncLocalStorage } from "node:async_hooks";
import { IApplicationStorage } from "core/storage/IApplicationStorage";
import { IBeatmapCacheRepository } from "core/storage/IBeatmapCacheRepository";
import { IChatMembershipRepository } from "core/storage/IChatMembershipRepository";
import { IChatSettingsRepository } from "core/storage/IChatSettingsRepository";
import { IErrorStore } from "core/storage/IErrorStore";
import { IFeatureFlags } from "core/storage/IFeatureFlags";
import { GameServerName } from "core/storage/GameServerName";
import { IGameUserRepository } from "core/storage/IGameUserRepository";
import { IIdentityLinkRepository } from "core/storage/IIdentityLinkRepository";
import { IIgnoredUsersRepository } from "core/storage/IIgnoredUsersRepository";
import { IMaintenanceRepository } from "core/storage/IMaintenanceRepository";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";
import { INotificationAudience } from "core/storage/INotificationAudience";
import { IOnboardingRepository } from "core/storage/IOnboardingRepository";
import { IPlatformStorageHost } from "core/storage/IPlatformStorageHost";
import { ITelemetrySink } from "core/storage/ITelemetrySink";
import { IUserDirectory } from "core/storage/IUserDirectory";
import { IUserRemovalRepository } from "core/storage/IUserRemovalRepository";
import { IUserSettingsRepository } from "core/storage/IUserSettingsRepository";
import { IIdentityRepository } from "core/IIdentityRepository";
import { Platform } from "core/Platform";

const GAME_SERVERS: GameServerName[] = ["bancho", "gatari", "ripple", "akatsuki", "beatleader", "scoresaber"];

export class PlatformStorage implements IPlatformStorageHost {
    readonly platforms: readonly Platform[];
    readonly identities: IIdentityRepository;
    readonly gameServers: Record<GameServerName, IGameUserRepository>;
    readonly errors: IErrorStore;
    readonly memberships: IChatMembershipRepository;
    readonly ignoredUsers: IIgnoredUsersRepository;
    readonly userRemoval: IUserRemovalRepository;
    readonly beatmaps: IBeatmapCacheRepository;
    readonly userSettings: IUserSettingsRepository;
    readonly chatSettings: IChatSettingsRepository;
    readonly notificationAudience: INotificationAudience;
    readonly featureFlags: IFeatureFlags;
    readonly telemetry: ITelemetrySink;
    readonly onboarding: IOnboardingRepository;
    readonly userDirectory: IUserDirectory;
    readonly mediaReferences: IMediaReferenceCache;
    readonly identityLinks: IIdentityLinkRepository;
    readonly maintenance: IMaintenanceRepository;

    private readonly scope = new AsyncLocalStorage<Platform>();
    private readonly stores = new Map<Platform, IApplicationStorage>();
    private readonly defaultStorage: IApplicationStorage;

    constructor(storages: IApplicationStorage[]) {
        if (storages.length === 0) {
            throw new Error("At least one platform storage is required");
        }
        for (const storage of storages) {
            if (this.stores.has(storage.platform)) {
                throw new Error(`Duplicate storage for platform '${storage.platform}'`);
            }
            this.stores.set(storage.platform, storage);
        }

        this.platforms = [...this.stores.keys()];
        this.defaultStorage = storages[0];

        this.identities = this.route((storage) => storage.identities);
        this.memberships = this.route((storage) => storage.memberships);
        this.notificationAudience = this.route((storage) => storage.notificationAudience);
        this.telemetry = this.route((storage) => storage.telemetry);
        this.userDirectory = this.route((storage) => storage.userDirectory);
        this.mediaReferences = this.route((storage) => storage.mediaReferences);
        this.maintenance = this.route((storage) => storage.maintenance);
        this.gameServers = Object.fromEntries(
            GAME_SERVERS.map((server) => [server, this.route((storage) => storage.gameServers[server])])
        ) as Record<GameServerName, IGameUserRepository>;

        // These repositories are keyed by internal IDs and are platform-neutral.
        this.errors = this.defaultStorage.errors;
        this.ignoredUsers = this.defaultStorage.ignoredUsers;
        this.userRemoval = this.defaultStorage.userRemoval;
        this.beatmaps = this.defaultStorage.beatmaps;
        this.userSettings = this.defaultStorage.userSettings;
        this.chatSettings = this.defaultStorage.chatSettings;
        this.featureFlags = this.defaultStorage.featureFlags;
        this.onboarding = this.defaultStorage.onboarding;
        this.identityLinks = this.defaultStorage.identityLinks;
    }

    get platform(): Platform {
        return this.currentPlatform;
    }

    get currentPlatform(): Platform {
        const platform = this.scope.getStore();
        if (!platform) {
            throw new Error("Platform-scoped storage was accessed outside an update context");
        }
        return platform;
    }

    forPlatform(platform: Platform): IApplicationStorage {
        const storage = this.stores.get(platform);
        if (!storage) {
            throw new Error(`Storage for platform '${platform}' is not configured`);
        }
        return storage;
    }

    async runWithPlatform<T>(platform: Platform, callback: () => Promise<T>): Promise<T> {
        this.forPlatform(platform);
        return await this.scope.run(platform, callback);
    }

    async initialize(): Promise<void> {
        await this.defaultStorage.initialize();
    }

    async close(): Promise<void> {
        await Promise.all([...this.stores.values()].map((storage) => storage.close()));
    }

    private route<T extends object>(selector: (storage: IApplicationStorage) => T): T {
        return new Proxy({} as T, {
            get: (_target, property) => {
                const selected = selector(this.forPlatform(this.currentPlatform));
                const value = Reflect.get(selected, property, selected);
                return typeof value === "function" ? value.bind(selected) : value;
            },
        });
    }
}
