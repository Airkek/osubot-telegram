import { IIdentityRepository } from "core/IIdentityRepository";
import { Platform } from "core/Platform";
import { GameServerName } from "core/storage/GameServerName";
import { IBeatmapCacheRepository } from "core/storage/IBeatmapCacheRepository";
import { IChatMembershipRepository } from "core/storage/IChatMembershipRepository";
import { IChatSettingsRepository } from "core/storage/IChatSettingsRepository";
import { IErrorStore } from "core/storage/IErrorStore";
import { IFeatureFlags } from "core/storage/IFeatureFlags";
import { IGameUserRepository } from "core/storage/IGameUserRepository";
import { IIdentityLinkRepository } from "core/storage/IIdentityLinkRepository";
import { IIgnoredUsersRepository } from "core/storage/IIgnoredUsersRepository";
import { IMaintenanceRepository } from "core/storage/IMaintenanceRepository";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";
import { INotificationAudience } from "core/storage/INotificationAudience";
import { IOnboardingRepository } from "core/storage/IOnboardingRepository";
import { ITelemetrySink } from "core/storage/ITelemetrySink";
import { IUserDirectory } from "core/storage/IUserDirectory";
import { IUserRemovalRepository } from "core/storage/IUserRemovalRepository";
import { IUserSettingsRepository } from "core/storage/IUserSettingsRepository";

export interface IApplicationStorage {
    readonly platform: Platform;
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

    initialize(): Promise<void>;
    close(): Promise<void>;
}
