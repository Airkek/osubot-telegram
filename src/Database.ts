/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Bot as TG, InputFile } from "grammy";
import { Pool, QueryResult } from "pg";
import { APIUser, BeatmapStatus, IDatabaseServer, IDatabaseUser, IDatabaseUserStats } from "./Types";
import UnifiedMessageContext from "./TelegramSupport";
import { createHash } from "node:crypto";
import { OsuBeatmap } from "./beatmaps/osu/OsuBeatmap";

export type Language = "ru" | "en" | "zh";
export type LanguageOverride = Language | "do_not_override";

export interface ChatSettings {
    chat_id: number;
    render_enabled: boolean;
    notifications_enabled: boolean;
    language_override: LanguageOverride;
}

export interface UserSettings {
    user_id: number;
    render_enabled: boolean;
    ordr_skin: string;
    ordr_video: boolean;
    ordr_storyboard: boolean;
    ordr_bgdim: number;
    ordr_pp_counter: boolean;
    ordr_ur_counter: boolean;
    ordr_hit_counter: boolean;
    ordr_strain_graph: boolean;
    ordr_is_skin_custom: boolean;
    notifications_enabled: boolean;
    experimental_renderer: boolean;
    language_override: LanguageOverride;
}

class DatabaseServer implements IDatabaseServer {
    serverName: string;
    db: Database;

    constructor(serverName: string, db: Database) {
        this.serverName = serverName;
        this.db = db;
    }

    async getUser(id: number): Promise<IDatabaseUser | null> {
        return await this.db.get("SELECT * FROM users WHERE id = $1 AND server = $2", [id, this.serverName]);
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        return await this.db.all("SELECT * FROM users WHERE game_id = $1 AND server = $2", [id, this.serverName]);
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
        const dbUser = await this.db.get("SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3 LIMIT 1", [
            user.id,
            mode,
            this.serverName,
        ]);
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
        return await this.db.get("SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3", [
            u.game_id,
            mode,
            this.serverName,
        ]);
    }
}

class DatabaseCovers {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async addCover(id: number): Promise<string> {
        try {
            const file = new InputFile(new URL(`https://assets.ppy.sh/beatmaps/${id}/covers/cover@2x.jpg`));
            const send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO covers (id, attachment) VALUES ($1, $2)", [id, photo.toString()]);

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getCover(id: number): Promise<string> {
        const cover = await this.db.get("SELECT * FROM covers WHERE id = $1", [id]);
        if (!cover) {
            return this.addCover(id);
        }
        return cover.attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            const file = new InputFile(new URL(photoUrl));
            const send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO photos (url, attachment) VALUES ($1, $2)", [photoUrl, photo.toString()]);

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        const cover = await this.db.get("SELECT * FROM photos WHERE url = $1", [photoUrl]);
        if (!cover) {
            return this.addPhotoDoc(photoUrl);
        }
        return cover.attachment;
    }

    async removeEmpty() {
        await this.db.run("DELETE FROM covers WHERE attachment = $1", [""]);
        await this.db.run("DELETE FROM photos WHERE attachment = $1", [""]);
    }
}

class DatabaseUsersToChat {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async userJoined(userId: number, chatId: number): Promise<void> {
        await this.db.run("INSERT INTO users_to_chat (user_id, chat_id) VALUES ($1, $2)", [userId, chatId]);
    }

    async userLeft(userId: number, chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE user_id = $1 AND chat_id = $2", [userId, chatId]);
    }

    async getChatUsers(chatId: number): Promise<number[]> {
        const users = await this.db.all("SELECT * FROM users_to_chat WHERE chat_id = $1", [chatId]);
        return users.map((u) => u.user_id);
    }

    async removeChat(chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE chat_id = $1", [chatId]);
    }

    async getChats(): Promise<number[]> {
        const chats = await this.db.all("SELECT DISTINCT chat_id FROM users_to_chat");
        return chats.map((chat) => chat.chat_id);
    }

    async getChatCount(): Promise<number> {
        const result = await this.db.get("SELECT COUNT(DISTINCT chat_id) AS count FROM users_to_chat");
        return result.count;
    }

    async isUserInChat(userId: number, chatId: number): Promise<boolean> {
        const user = await this.db.get("SELECT * FROM users_to_chat WHERE user_id = $1 AND chat_id = $2", [
            userId,
            chatId,
        ]);
        return !!user;
    }
}

class DatabaseIgnore {
    db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getIgnoredUsers(): Promise<number[]> {
        const users = await this.db.all("SELECT id FROM ignored_users");
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
        let info = `Sent by: ${ctx.senderId}; Text: ${ctx.text}`;
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
        return await this.db.get("SELECT * FROM errors WHERE code = $1", [code]);
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

interface IMigration {
    version: number;
    name: string;
    process: (db: Database) => Promise<boolean>;
}

const migrations: IMigration[] = [
    {
        version: 1,
        name: "Create tables",
        process: async (db: Database) => {
            await db.run("CREATE TABLE IF NOT EXISTS covers (id BIGINT, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS photos (url TEXT, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS users_to_chat (user_id BIGINT, chat_id TEXT)");
            await db.run(
                "CREATE TABLE IF NOT EXISTS users (id BIGINT, game_id TEXT, nickname TEXT, mode SMALLINT, server TEXT)"
            );
            await db.run(
                "CREATE TABLE IF NOT EXISTS stats (id TEXT, nickname TEXT, server TEXT, mode SMALLINT, pp REAL DEFAULT 0, rank INTEGER DEFAULT 9999999, acc REAL DEFAULT 100)"
            );
            return true;
        },
    },
    {
        version: 2,
        name: "Create ignore list table",
        process: async (db: Database) => {
            await db.run("CREATE TABLE IF NOT EXISTS ignored_users (id BIGINT)");
            return true;
        },
    },
    {
        version: 3,
        name: "Remove all cached covers (migrate from raw to cover@2x)",
        process: async (db: Database) => {
            await db.run("DELETE FROM covers");
            return true;
        },
    },
    {
        version: 4,
        name: "Create osu! beatmap metadata cache table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS osu_beatmap_metadata
                 (
                     id            BIGINT,
                     set_id        BIGINT,
                     hash          TEXT,

                     title         TEXT,
                     artist        TEXT,

                     version       TEXT,
                     author        TEXT,
                     status        TEXT,

                     native_mode   SMALLINT,
                     native_length BIGINT
                 )`
            );
            return true;
        },
    },
    {
        version: 5,
        name: "Create settings table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS settings
                 (
                     user_id          BIGINT UNIQUE NOT NULL,
                     render_enabled   BOOLEAN  DEFAULT true,
                     ordr_skin        BIGINT   DEFAULT 60,
                     ordr_video       BOOLEAN  DEFAULT true,
                     ordr_storyboard  BOOLEAN  DEFAULT true,
                     ordr_bgdim       SMALLINT DEFAULT 75,
                     ordr_pp_counter  BOOLEAN  default true,
                     ordr_ur_counter  BOOLEAN  default true,
                     ordr_hit_counter BOOLEAN  default true
                 )`
            );
            return true;
        },
    },
    {
        version: 6,
        name: "Add ordr_strain_graph to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_strain_graph BOOLEAN DEFAULT true`
            );
            return true;
        },
    },
    {
        version: 7,
        name: "Change ordr_skin type to TEXT",
        process: async (db: Database) => {
            await db.run(`ALTER TABLE settings
                RENAME TO temp_settings`);

            await db.run(`
                CREATE TABLE settings
                (
                    user_id           BIGINT UNIQUE NOT NULL,
                    render_enabled    BOOLEAN  DEFAULT true,
                    ordr_skin         TEXT     DEFAULT 'whitecatCK1.0',
                    ordr_video        BOOLEAN  DEFAULT true,
                    ordr_storyboard   BOOLEAN  DEFAULT true,
                    ordr_bgdim        SMALLINT DEFAULT 75,
                    ordr_pp_counter   BOOLEAN  DEFAULT true,
                    ordr_ur_counter   BOOLEAN  DEFAULT true,
                    ordr_hit_counter  BOOLEAN  DEFAULT true,
                    ordr_strain_graph BOOLEAN  DEFAULT true
                )
            `);

            await db.run(`
                INSERT INTO settings
                SELECT user_id,
                       render_enabled,
                       CAST(ordr_skin AS TEXT),
                       ordr_video,
                       ordr_storyboard,
                       ordr_bgdim,
                       ordr_pp_counter,
                       ordr_ur_counter,
                       ordr_hit_counter,
                       ordr_strain_graph
                FROM temp_settings
            `);

            await db.run(`DROP TABLE temp_settings`);

            return true;
        },
    },
    {
        version: 8,
        name: "Add ability to set custom o!rdr skin",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN ordr_is_skin_custom BOOLEAN DEFAULT false`
            );
            return true;
        },
    },
    {
        version: 9,
        name: "Create chat_settings table",
        process: async (db: Database) => {
            await db.run(
                `CREATE TABLE IF NOT EXISTS chat_settings
                 (
                     chat_id          BIGINT UNIQUE NOT NULL,
                     render_enabled   BOOLEAN  DEFAULT true
                 )`
            );
            return true;
        },
    },
    {
        version: 10,
        name: "Remove Qualified maps from cache",
        process: async (db: Database) => {
            await db.run(`DELETE FROM osu_beatmap_metadata WHERE status = $1`, [
                BeatmapStatus[BeatmapStatus.Qualified],
            ]);
            return true;
        },
    },
    {
        version: 11,
        name: "Add notifications_enabled to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE chat_settings
             ADD COLUMN notifications_enabled BOOLEAN DEFAULT true`
            );
            await db.run(
                `ALTER TABLE settings
             ADD COLUMN notifications_enabled BOOLEAN DEFAULT true`
            );
            return true;
        },
    },
    {
        version: 12,
        name: "Add experimental_renderer to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN experimental_renderer BOOLEAN DEFAULT false`
            );
            return true;
        },
    },
    {
        version: 13,
        name: "Add language_override to settings",
        process: async (db: Database) => {
            await db.run(
                `ALTER TABLE chat_settings
                    ADD COLUMN language_override TEXT DEFAULT 'do_not_override'`
            );
            await db.run(
                `ALTER TABLE settings
                    ADD COLUMN language_override TEXT DEFAULT 'do_not_override'`
            );
            return true;
        },
    },
];

async function applyMigrations(db: Database) {
    global.logger.info("Applying migrations");
    const applied = new Set<number>();
    const dbData: IMigration[] = await db.all("SELECT version FROM migrations");
    for (const m of dbData) {
        applied.add(m.version);
    }

    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }

        global.logger.info(`Processing migration #${migration.version}: ${migration.name}`);

        let res = false;
        try {
            res = await migration.process(db);
        } catch (e) {
            global.logger.error(e);
        }

        if (res) {
            global.logger.info("Success");
            await db.run("INSERT INTO migrations (version) VALUES ($1)", [migration.version]);
        } else {
            global.logger.fatal("Failed. Aborting");
            process.abort();
        }
    }
}

export class DatabaseUserSettings {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getUserSettings(id: number): Promise<UserSettings | null> {
        const res = await this.db.get("SELECT * FROM settings WHERE user_id = $1", [id]);
        if (!res) {
            await this.db.run("INSERT INTO settings (user_id) VALUES ($1)", [id]);
            return await this.getUserSettings(id);
        }
        return res;
    }

    async updateSettings(settings: UserSettings): Promise<void> {
        await this.db.run(
            `UPDATE settings
             SET render_enabled        = $1,
                 ordr_skin             = $2,
                 ordr_video            = $3,
                 ordr_storyboard       = $4,
                 ordr_bgdim            = $5,
                 ordr_pp_counter       = $6,
                 ordr_ur_counter       = $7,
                 ordr_hit_counter      = $8,
                 ordr_strain_graph     = $9,
                 ordr_is_skin_custom   = $10,
                 notifications_enabled = $11,
                 experimental_renderer = $12,
                 language_override     = $13
             WHERE user_id = $14`,
            [
                settings.render_enabled,
                settings.ordr_skin,
                settings.ordr_video,
                settings.ordr_storyboard,
                settings.ordr_bgdim,
                settings.ordr_pp_counter,
                settings.ordr_ur_counter,
                settings.ordr_hit_counter,
                settings.ordr_strain_graph,
                settings.ordr_is_skin_custom,
                settings.notifications_enabled,
                settings.experimental_renderer,
                settings.language_override,
                settings.user_id,
            ]
        );
    }
}

export class DatabaseChatSettings {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getChatSettings(id: number): Promise<ChatSettings | null> {
        const res = await this.db.get("SELECT * FROM chat_settings WHERE chat_id = $1", [id]);
        if (!res) {
            await this.db.run("INSERT INTO chat_settings (chat_id) VALUES ($1)", [id]);
            return await this.getChatSettings(id);
        }
        return res;
    }

    async updateSettings(settings: ChatSettings): Promise<void> {
        await this.db.run(
            `UPDATE chat_settings
             SET render_enabled        = $1,
                 notifications_enabled = $2,
                 language_override     = $3
             WHERE chat_id = $4`,
            [settings.render_enabled, settings.notifications_enabled, settings.language_override, settings.chat_id]
        );
    }
}

export interface IOsuBeatmapMetadata {
    id: number;
    set_id: number;
    hash: string;

    title: string;
    artist: string;

    version: string;
    author: string;
    status: string;

    native_mode: number;
    native_length: number;
}

export class DatabaseOsuBeatmapMetadataCache {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getBeatmapById(id: number): Promise<IOsuBeatmapMetadata | null> {
        return await this.db.get("SELECT * FROM osu_beatmap_metadata WHERE id = $1", [id]);
    }

    async getBeatmapByHash(hash: string): Promise<IOsuBeatmapMetadata | null> {
        return await this.db.get("SELECT * FROM osu_beatmap_metadata WHERE hash = $1", [hash]);
    }

    async addToCache(map: OsuBeatmap): Promise<void> {
        const byId = await this.getBeatmapById(map.id);
        if (byId) {
            if (byId.hash === map.hash) {
                return;
            }

            await this.db.run(
                `UPDATE osu_beatmap_metadata
                 SET set_id        = $1,
                     hash          = $2,
                     title         = $3,
                     artist        = $4,
                     version       = $5,
                     author        = $6,
                     status        = $7,
                     native_mode   = $8,
                     native_length = $9
                 WHERE id = $10`,
                [
                    map.setId,
                    map.hash,
                    map.title,
                    map.artist,
                    map.version,
                    map.author,
                    map.status,
                    map.native_mode,
                    map.native_length,
                    map.id,
                ]
            );
            return;
        }

        await this.db.run(
            `INSERT INTO osu_beatmap_metadata
             (id, set_id, hash, title, artist, version, author, status, native_mode, native_length)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                map.id,
                map.setId,
                map.hash,
                map.title,
                map.artist,
                map.version,
                map.author,
                map.status,
                map.native_mode,
                map.native_length,
            ]
        );
    }
}

class NotificationsModel {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getChatCountForNotifications(): Promise<number> {
        const result = await this.db.get(
            `SELECT COUNT(DISTINCT utc.chat_id) AS count
         FROM users_to_chat utc
            LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
         WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return result.count;
    }

    async getUserCountForNotifications(): Promise<number> {
        const result = await this.db.get(
            `SELECT COUNT(DISTINCT u.id) AS count
         FROM users u
            LEFT JOIN settings cs ON u.id = cs.user_id
         WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return result.count;
    }

    async getChatsForNotifications(): Promise<number[]> {
        const chats = await this.db.all(
            `SELECT DISTINCT utc.chat_id
             FROM users_to_chat utc
                LEFT JOIN chat_settings cs ON CAST(utc.chat_id AS BIGINT) = cs.chat_id
             WHERE cs.notifications_enabled = true OR cs.chat_id IS NULL`
        );
        return chats.map((chat) => chat.chat_id);
    }

    async getUsersForNotifications(): Promise<number[]> {
        const users = await this.db.all(
            `SELECT DISTINCT u.id
             FROM users u
                LEFT JOIN settings cs ON u.id = cs.user_id
             WHERE cs.notifications_enabled = true OR cs.user_id IS NULL`
        );
        return users.map((user) => user.id);
    }
}

export default class Database {
    servers: IServersList;
    covers: DatabaseCovers;
    errors: DatabaseErrors;
    chats: DatabaseUsersToChat;
    ignore: DatabaseIgnore;
    drop: DatabaseDrop;
    osuBeatmapMeta: DatabaseOsuBeatmapMetadataCache;
    userSettings: DatabaseUserSettings;
    chatSettings: DatabaseChatSettings;
    notifications: NotificationsModel;

    db: Pool;
    tg: TG;
    owner: number;

    constructor(tg: TG, owner: number) {
        this.servers = {
            bancho: new DatabaseServer("bancho", this),
            gatari: new DatabaseServer("gatari", this),
            ripple: new DatabaseServer("ripple", this),
            akatsuki: new DatabaseServer("akatsuki", this),
            beatleader: new DatabaseServer("beatleader", this),
            scoresaber: new DatabaseServer("scoresaber", this),
        };

        this.covers = new DatabaseCovers(this);
        this.errors = new DatabaseErrors(this);
        this.chats = new DatabaseUsersToChat(this);
        this.ignore = new DatabaseIgnore(this);
        this.drop = new DatabaseDrop(this);
        this.osuBeatmapMeta = new DatabaseOsuBeatmapMetadataCache(this);
        this.userSettings = new DatabaseUserSettings(this);
        this.chatSettings = new DatabaseChatSettings(this);
        this.notifications = new NotificationsModel(this);

        this.db = new Pool({
            user: process.env.DB_USERNAME,
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
        });

        this.tg = tg;
        this.owner = owner;
    }

    async get(stmt: string, opts: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<any>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.rows[0] || null);
                }
            });
        });
    }

    async all(stmt: string, opts: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<any>) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(res.rows);
                }
            });
        });
    }

    async run(stmt: string, opts: any[] = []): Promise<QueryResult<any>> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<any>) => {
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
        await this.run("CREATE TABLE IF NOT EXISTS migrations (version INTEGER)");

        await applyMigrations(this);
        global.logger.info("Database initialized successfully");
    }
}
