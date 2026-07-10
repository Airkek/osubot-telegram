import { AsyncLocalStorage } from "node:async_hooks";
import {
    ApplicationStorage,
    BeatmapCacheRepository,
    ChatMembershipRepository,
    ChatSettingsRepository,
    ErrorStore,
    FeatureFlags,
    GameServerName,
    GameUserRepository,
    IdentityLinkRepository,
    IgnoredUsersRepository,
    MaintenanceRepository,
    MediaReferenceCache,
    NotificationAudience,
    OnboardingRepository,
    PlatformStorageHost,
    TelemetrySink,
    UserDirectory,
    UserRemovalRepository,
    UserSettingsRepository,
} from "./ApplicationStorage";
import { IdentityRepository, Platform } from "./Identity";

const GAME_SERVERS: GameServerName[] = ["bancho", "gatari", "ripple", "akatsuki", "beatleader", "scoresaber"];

export class PlatformStorage implements PlatformStorageHost {
    readonly platforms: readonly Platform[];
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

    private readonly scope = new AsyncLocalStorage<Platform>();
    private readonly stores = new Map<Platform, ApplicationStorage>();
    private readonly defaultStorage: ApplicationStorage;

    constructor(storages: ApplicationStorage[]) {
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
        ) as Record<GameServerName, GameUserRepository>;

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

    forPlatform(platform: Platform): ApplicationStorage {
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

    private route<T extends object>(selector: (storage: ApplicationStorage) => T): T {
        return new Proxy({} as T, {
            get: (_target, property) => {
                const selected = selector(this.forPlatform(this.currentPlatform));
                const value = Reflect.get(selected, property, selected);
                return typeof value === "function" ? value.bind(selected) : value;
            },
        });
    }
}
