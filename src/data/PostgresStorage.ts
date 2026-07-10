import { Pool } from "pg";
import { createHash } from "node:crypto";
import { applyMigrations } from "./Migrations";
import { FeatureControlModel } from "./Models/FeatureControlModel";
import { NotificationsModel } from "./Models/NotificationsModel";
import { ChatSettingsModel } from "./Models/Settings/ChatSettingsModel";
import { UserSettingsModel } from "./Models/Settings/UserSettingsModel";
import { OsuBeatmapCacheModel } from "./Models/OsuBeatmapCacheModel";
import { StatisticsModel } from "./Models/StatisticsModel";
import { ChatMembersModel } from "./Models/ChatMembersModel";
import { OnboardingModel } from "./Models/OnboardingModel";
import UserInfoModel from "./Models/UserInfoModel";
import {
    ApplicationStorage,
    ErrorContext,
    GameServerName,
    GameUserRepository,
    StoredError,
} from "../core/ApplicationStorage";
import { SqlConnection, SqlExecutor } from "./SqlExecutor";
import { PostgresConnection } from "./PostgresConnection";
import { MediaReferenceModel } from "./Models/MediaReferenceModel";
import { MaintenanceModel } from "./Models/MaintenanceModel";
import { Platform } from "../core/Identity";
import { PostgresIdentityRepository } from "./Repositories/PostgresIdentityRepository";
import { PostgresGameUserRepository } from "./Repositories/PostgresGameUserRepository";
import { PostgresIdentityLinkRepository } from "./Repositories/PostgresIdentityLinkRepository";

interface IgnoredUsers {
    platform_account_id: number;
}

class PostgresIgnoredUsersRepository {
    constructor(private readonly db: SqlExecutor) {}

    async getIgnoredUsers(): Promise<number[]> {
        const users = await this.db.all<IgnoredUsers>(
            `SELECT ignored.platform_account_id
             FROM ignored_users AS ignored`
        );
        return users.map((user) => Number(user.platform_account_id));
    }

    async unignoreUser(accountId: number): Promise<void> {
        await this.db.run("DELETE FROM ignored_users WHERE platform_account_id = $1", [accountId]);
    }

    async ignoreUser(accountId: number): Promise<void> {
        await this.db.run(
            `INSERT INTO ignored_users (platform_account_id)
             VALUES ($1)
             ON CONFLICT (platform_account_id) DO NOTHING`,
            [accountId]
        );
    }
}

class PostgresUserRemovalRepository {
    db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async dropUser(userId: number): Promise<void> {
        await this.db.run("DELETE FROM users WHERE app_user_id = $1", [userId]);
    }
}

class PostgresErrorStore {
    db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async addError(ctx: ErrorContext, error: unknown): Promise<string> {
        let info = `Platform: ${ctx.platform}; Sent by account: ${ctx.senderId}; Text: ${ctx.plainPayload ?? ctx.plainText}`;
        if (ctx.replyMessage) {
            info += `; Replied to: ${ctx.replyMessage.senderId}`;
        }

        const errorText = error instanceof Error ? error.stack || error.message : String(error);

        const hash = createHash("sha3-256")
            .update(info + errorText)
            .digest("hex")
            .slice(0, 10);
        const check = await this.getError(hash);
        if (!check) {
            await this.db.run("INSERT INTO errors (code, info, error) VALUES ($1, $2, $3)", [hash, info, errorText]);
        }
        return hash;
    }

    async getError(code: string): Promise<StoredError | null> {
        return await this.db.get<StoredError>("SELECT * FROM errors WHERE code = $1", [code]);
    }

    async clear() {
        await this.db.run("DELETE FROM errors");
    }
}

export default class PostgresStorage implements ApplicationStorage {
    readonly identities: PostgresIdentityRepository;
    readonly gameServers: Record<GameServerName, GameUserRepository>;
    readonly errors: PostgresErrorStore;
    readonly memberships: ChatMembersModel;
    readonly ignoredUsers: PostgresIgnoredUsersRepository;
    readonly userRemoval: PostgresUserRemovalRepository;
    readonly beatmaps: OsuBeatmapCacheModel;
    readonly userSettings: UserSettingsModel;
    readonly chatSettings: ChatSettingsModel;
    readonly notificationAudience: NotificationsModel;
    readonly featureFlags: FeatureControlModel;
    readonly telemetry: StatisticsModel;
    readonly onboarding: OnboardingModel;
    readonly userDirectory: UserInfoModel;
    readonly mediaReferences: MediaReferenceModel;
    readonly identityLinks: PostgresIdentityLinkRepository;
    readonly maintenance: MaintenanceModel;

    constructor(
        private readonly db: SqlConnection,
        readonly platform: Platform,
        private readonly ownsConnection: boolean = true
    ) {
        this.identities = new PostgresIdentityRepository(db, platform);
        this.gameServers = {
            bancho: new PostgresGameUserRepository("bancho", db, platform),
            gatari: new PostgresGameUserRepository("gatari", db, platform),
            ripple: new PostgresGameUserRepository("ripple", db, platform),
            akatsuki: new PostgresGameUserRepository("akatsuki", db, platform),
            beatleader: new PostgresGameUserRepository("beatleader", db, platform),
            scoresaber: new PostgresGameUserRepository("scoresaber", db, platform),
        };

        this.errors = new PostgresErrorStore(db);
        this.memberships = new ChatMembersModel(db, platform);
        this.ignoredUsers = new PostgresIgnoredUsersRepository(db);
        this.userRemoval = new PostgresUserRemovalRepository(db);
        this.beatmaps = new OsuBeatmapCacheModel(db);
        this.userSettings = new UserSettingsModel(db);
        this.chatSettings = new ChatSettingsModel(db);
        this.notificationAudience = new NotificationsModel(db, platform);
        this.featureFlags = new FeatureControlModel(db);
        this.telemetry = new StatisticsModel(db, platform);
        this.onboarding = new OnboardingModel(db);
        this.userDirectory = new UserInfoModel(db, platform);
        this.mediaReferences = new MediaReferenceModel(db, platform);
        this.identityLinks = new PostgresIdentityLinkRepository(db);
        this.maintenance = new MaintenanceModel(db, platform);
    }

    static fromEnvironment(platform: Platform): PostgresStorage {
        return PostgresStorage.fromEnvironmentForPlatforms([platform])[0];
    }

    static fromEnvironmentForPlatforms(platforms: Platform[]): PostgresStorage[] {
        if (platforms.length === 0) {
            throw new Error("At least one PostgreSQL platform storage is required");
        }
        const pool = new Pool({
            user: process.env.DB_USERNAME,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
        });
        const connection = new PostgresConnection(pool);
        return platforms.map((platform, index) => new PostgresStorage(connection, platform, index === 0));
    }

    async initialize(): Promise<void> {
        global.logger.info("Initializing database");
        await this.db.run("CREATE TABLE IF NOT EXISTS migrations (version INTEGER UNIQUE)");

        await applyMigrations(this.db);
        global.logger.info("Database initialized successfully");
    }

    async close(): Promise<void> {
        if (this.ownsConnection) {
            await this.db.close();
        }
    }
}
