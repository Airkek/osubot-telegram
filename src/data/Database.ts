import { Bot as TG } from "grammy";
import { Pool, QueryResult } from "pg";
import { APIUser, IDatabaseServer, IDatabaseUser, IDatabaseUserStats } from "../Types";
import UnifiedMessageContext from "../TelegramSupport";
import { createHash } from "node:crypto";
import { applyMigrations } from "./Migrations";
import { FeatureControlModel } from "./Models/FeatureControlModel";
import { NotificationsModel } from "./Models/NotificationsModel";
import { ChatSettingsModel } from "./Models/Settings/ChatSettingsModel";
import { UserSettingsModel } from "./Models/Settings/UserSettingsModel";
import { OsuBeatmapCacheModel } from "./Models/OsuBeatmapCacheModel";
import { StatisticsModel } from "./Models/StatisticsModel";
import { CoversModel } from "./Models/CoversModel";
import { ChatMembersModel } from "./Models/ChatMembersModel";

// TODO: move all classes to src/data/Models/Settings
class DatabaseServer implements IDatabaseServer {
    serverName: string;
    db: Database;

    constructor(serverName: string, db: Database) {
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
            await this.db.run("UPDATE users SET nickname = $1, game_id = $2 WHERE id = $3 AND server = $4", [
                nickname,
                game_id,
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

    async getUserStats(id: number, mode: number): Promise<IDatabaseUserStats> {
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

class DatabaseIgnore {
    db: Database;

    constructor(db: Database) {
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

class DatabaseDrop {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async dropUser(userId: number): Promise<void> {
        await this.db.run("DELETE FROM users WHERE id = $1", [userId]);
    }
}

interface IDatabaseError {
    code: string;
    info: string;
    error: string;
}

class DatabaseErrors {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async addError(ctx: UnifiedMessageContext, error: unknown): Promise<string> {
        let info = `Sent by: ${ctx.senderId}; Text: ${ctx.plainPayload ?? ctx.plainText}`;
        if (ctx.replyMessage) {
            info += `; Replied to: ${ctx.replyMessage.senderId}`;
        }

        let errorText: string;

        if (error instanceof Error) {
            errorText = error.stack;
        } else if (error instanceof String) {
            errorText = String(error);
        }

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

    async getError(code: string): Promise<IDatabaseError | null> {
        return await this.db.get<IDatabaseError>("SELECT * FROM errors WHERE code = $1", [code]);
    }

    async clear() {
        await this.db.run("DELETE FROM errors");
    }
}

interface IServersList {
    bancho: DatabaseServer;
    gatari: DatabaseServer;
    ripple: DatabaseServer;
    akatsuki: DatabaseServer;
    beatleader: DatabaseServer;
    scoresaber: DatabaseServer;
}

export default class Database {
    // TODO: move out of there
    readonly servers: IServersList;
    readonly covers: CoversModel;
    readonly errors: DatabaseErrors;
    readonly chats: ChatMembersModel;
    readonly ignore: DatabaseIgnore;
    readonly drop: DatabaseDrop;
    readonly osuBeatmapMeta: OsuBeatmapCacheModel;
    readonly userSettings: UserSettingsModel;
    readonly chatSettings: ChatSettingsModel;
    readonly notifications: NotificationsModel;
    readonly featureControlModel: FeatureControlModel;
    readonly statsModel: StatisticsModel;

    private readonly db: Pool;
    private readonly tg: TG;
    private readonly owner: number;

    constructor(tg: TG, owner: number) {
        this.tg = tg;
        this.owner = owner;

        this.servers = {
            bancho: new DatabaseServer("bancho", this),
            gatari: new DatabaseServer("gatari", this),
            ripple: new DatabaseServer("ripple", this),
            akatsuki: new DatabaseServer("akatsuki", this),
            beatleader: new DatabaseServer("beatleader", this),
            scoresaber: new DatabaseServer("scoresaber", this),
        };

        this.covers = new CoversModel(this, this.tg, this.owner);
        this.errors = new DatabaseErrors(this);
        this.chats = new ChatMembersModel(this);
        this.ignore = new DatabaseIgnore(this);
        this.drop = new DatabaseDrop(this);
        this.osuBeatmapMeta = new OsuBeatmapCacheModel(this);
        this.userSettings = new UserSettingsModel(this);
        this.chatSettings = new ChatSettingsModel(this);
        this.notifications = new NotificationsModel(this);
        this.featureControlModel = new FeatureControlModel(this);
        this.statsModel = new StatisticsModel(this);

        this.db = new Pool({
            user: process.env.DB_USERNAME,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async get<T>(stmt: string, opts: any[] = []): Promise<T> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<T>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.rows[0] || null);
                }
            });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async all<T>(stmt: string, opts: any[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<T>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.rows);
                }
            });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async run(stmt: string, opts: any[] = []): Promise<QueryResult<unknown>> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<unknown>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        });
    }

    async init() {
        global.logger.info("Initializing database");
        await this.run("CREATE TABLE IF NOT EXISTS migrations (version INTEGER UNIQUE)");

        await applyMigrations(this);
        global.logger.info("Database initialized successfully");
    }
}
