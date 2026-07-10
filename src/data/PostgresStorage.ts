import { Pool } from "pg";
import { APIUser, IDatabaseUser, IDatabaseUserStats } from "../Types";
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

// TODO: move all classes to src/data/Models/Settings
class PostgresGameUserRepository implements GameUserRepository {
    serverName: string;
    db: SqlExecutor;

    constructor(serverName: string, db: SqlExecutor) {
        this.serverName = serverName;
        this.db = db;
    }

    async getUser(id: number): Promise<IDatabaseUser | null> {
        return await this.db.get<IDatabaseUser>("SELECT * FROM users WHERE id = $1 AND server = $2", [
            id,
            this.serverName,
        ]);
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        return await this.db.all<IDatabaseUser>("SELECT * FROM users WHERE game_id = $1 AND server = $2", [
            id,
            this.serverName,
        ]);
    }

    async setNickname(id: number, game_id: number | string, nickname: string, mode: number = 0): Promise<void> {
        const user: IDatabaseUser = await this.getUser(id);
        if (!user) {
            await this.db.run("INSERT INTO users (id, game_id, nickname, mode, server) VALUES ($1, $2, $3, $4, $5)", [
                id,
                game_id,
                nickname,
                mode,
                this.serverName,
            ]);
        } else {
            await this.db.run("UPDATE users SET nickname = $1, game_id = $2, mode = $3 WHERE id = $4 AND server = $5", [
                nickname,
                game_id,
                mode,
                id,
                this.serverName,
            ]);
        }
    }

    async setMode(id: number, mode: number): Promise<boolean> {
        const user: IDatabaseUser = await this.getUser(id);
        if (!user) {
            return false;
        }
        await this.db.run("UPDATE users SET mode = $1 WHERE id = $2 AND server = $3", [mode, id, this.serverName]);
        return true;
    }

    async updateInfo(user: APIUser, mode: number): Promise<void> {
        const dbUser = await this.db.get<IDatabaseUserStats>(
            "SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3 LIMIT 1",
            [user.id, mode, this.serverName]
        );
        if (!dbUser) {
            await this.db.run(
                "INSERT INTO stats (id, nickname, pp, rank, acc, mode, server) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [user.id, user.nickname, user.pp, user.rank.total, user.accuracy, mode, this.serverName]
            );
        } else {
            await this.db.run(
                "UPDATE stats SET nickname = $1, pp = $2, rank = $3, acc = $4 WHERE id = $5 AND mode = $6 AND server = $7",
                [user.nickname, user.pp, user.rank.total, user.accuracy, user.id, mode, this.serverName]
            );
        }
    }

    async getUserStats(id: number, mode: number): Promise<IDatabaseUserStats | null> {
        const u = await this.getUser(id);
        if (!u) {
            return null;
        }
        return await this.db.get<IDatabaseUserStats>(
            "SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3",
            [u.game_id, mode, this.serverName]
        );
    }
}

interface IgnoredUsers {
    id: number;
}

class PostgresIgnoredUsersRepository {
    db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async getIgnoredUsers(): Promise<number[]> {
        const users = await this.db.all<IgnoredUsers>("SELECT id FROM ignored_users");
        return users.map((u) => Number(u.id));
    }

    async unignoreUser(userId: number): Promise<void> {
        await this.db.run("DELETE FROM ignored_users WHERE id = $1", [userId]);
    }

    async ignoreUser(userId: number): Promise<void> {
        await this.db.run("INSERT INTO ignored_users (id) VALUES ($1)", [userId]);
    }
}

class PostgresUserRemovalRepository {
    db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async dropUser(userId: number): Promise<void> {
        await this.db.run("DELETE FROM users WHERE id = $1", [userId]);
    }
}

class PostgresErrorStore {
    db: SqlExecutor;

    constructor(db: SqlExecutor) {
        this.db = db;
    }

    async addError(ctx: ErrorContext, error: unknown): Promise<string> {
        let info = `Sent by: ${ctx.senderId}; Text: ${ctx.plainPayload ?? ctx.plainText}`;
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
    readonly maintenance: MaintenanceModel;

    constructor(private readonly db: SqlConnection) {
        this.gameServers = {
            bancho: new PostgresGameUserRepository("bancho", db),
            gatari: new PostgresGameUserRepository("gatari", db),
            ripple: new PostgresGameUserRepository("ripple", db),
            akatsuki: new PostgresGameUserRepository("akatsuki", db),
            beatleader: new PostgresGameUserRepository("beatleader", db),
            scoresaber: new PostgresGameUserRepository("scoresaber", db),
        };

        this.errors = new PostgresErrorStore(db);
        this.memberships = new ChatMembersModel(db);
        this.ignoredUsers = new PostgresIgnoredUsersRepository(db);
        this.userRemoval = new PostgresUserRemovalRepository(db);
        this.beatmaps = new OsuBeatmapCacheModel(db);
        this.userSettings = new UserSettingsModel(db);
        this.chatSettings = new ChatSettingsModel(db);
        this.notificationAudience = new NotificationsModel(db);
        this.featureFlags = new FeatureControlModel(db);
        this.telemetry = new StatisticsModel(db);
        this.onboarding = new OnboardingModel(db);
        this.userDirectory = new UserInfoModel(db);
        this.mediaReferences = new MediaReferenceModel(db);
        this.maintenance = new MaintenanceModel(db);
    }

    static fromEnvironment(): PostgresStorage {
        const pool = new Pool({
            user: process.env.DB_USERNAME,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
        });
        return new PostgresStorage(new PostgresConnection(pool));
    }

    async initialize(): Promise<void> {
        global.logger.info("Initializing database");
        await this.db.run("CREATE TABLE IF NOT EXISTS migrations (version INTEGER UNIQUE)");

        await applyMigrations(this.db);
        global.logger.info("Database initialized successfully");
    }

    async close(): Promise<void> {
        await this.db.close();
    }
}
