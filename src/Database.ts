/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Bot as TG, InputFile } from "grammy";
import { Pool, QueryResult } from "pg";
import util from "./Util";
import {
    APIUser,
    IDatabaseUser,
    IDatabaseUserStats,
    IDatabaseServer,
} from "./Types";
import UnifiedMessageContext from "./TelegramSupport";

class DatabaseServer implements IDatabaseServer {
    serverName: string;
    db: Database;
    constructor(serverName: string, db: Database) {
        this.serverName = serverName;
        this.db = db;
    }

    async getUser(id: number): Promise<IDatabaseUser | null> {
        const user: IDatabaseUser = await this.db.get(
            "SELECT * FROM users WHERE id = $1 AND server = $2",
            [id, this.serverName]
        );
        return user;
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        const users: IDatabaseUser[] = await this.db.all(
            "SELECT * FROM users WHERE game_id = $1 AND server = $2 COLLATE NOCASE",
            [id, this.serverName]
        );
        return users;
    }

    async setNickname(
        id: number,
        game_id: number | string,
        nickname: string,
        mode: number = 0
    ): Promise<void> {
        const user: IDatabaseUser = await this.getUser(id);
        if (!user.id) {
            await this.db.run(
                "INSERT INTO users (id, game_id, nickname, mode, server) VALUES ($1, $2, $3, $4, $5)",
                [id, game_id, nickname, mode, this.serverName]
            );
        } else {
            await this.db.run(
                "UPDATE users SET nickname = $1, game_id = $2 WHERE id = $3 AND server = $4",
                [nickname, game_id, id, this.serverName]
            );
        }
    }

    async setMode(id: number, mode: number): Promise<boolean> {
        const user: IDatabaseUser = await this.getUser(id);
        if (!user) {
            return false;
        }
        await this.db.run(
            "UPDATE users SET mode = $1 WHERE id = $2 AND server = $3",
            [mode, id, this.serverName]
        );
        return true;
    }

    async updateInfo(user: APIUser, mode: number): Promise<void> {
        const dbUser = await this.db.get(
            "SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3 LIMIT 1",
            [user.id, mode, this.serverName]
        );
        if (!dbUser.id) {
            await this.db.run(
                "INSERT INTO stats (id, nickname, pp, rank, acc, mode, server) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                [
                    user.id,
                    user.nickname,
                    user.pp,
                    user.rank.total,
                    user.accuracy,
                    mode,
                    this.serverName,
                ]
            );
        } else {
            await this.db.run(
                "UPDATE stats SET nickname = $1, pp = $2, rank = $3, acc = $4 WHERE id = $5 AND mode = $6 AND server = $7",
                [
                    user.nickname,
                    user.pp,
                    user.rank.total,
                    user.accuracy,
                    user.id,
                    mode,
                    this.serverName,
                ]
            );
        }
    }

    async getUserStats(id: number, mode: number): Promise<IDatabaseUserStats> {
        const u = await this.getUser(id);
        const stats: IDatabaseUserStats = await this.db.get(
            "SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3",
            [u.game_id, mode, this.serverName]
        );
        return stats;
    }
}

class DatabaseCovers {
    db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    async addCover(id: number): Promise<string> {
        try {
            const file = new InputFile(
                new URL(`https://assets.ppy.sh/beatmaps/${id}/covers/raw.jpg`)
            );
            const send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run(
                "INSERT INTO covers (id, attachment) VALUES ($1, $2)",
                [id, photo.toString()]
            );

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getCover(id: number): Promise<string> {
        const cover = await this.db.get("SELECT * FROM covers WHERE id = $1", [
            id,
        ]);
        if (!cover.id) {
            return this.addCover(id);
        }
        return cover.attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            const file = new InputFile(new URL(photoUrl));
            const send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            const photo = send.photo[0].file_id;

            await this.db.run(
                "INSERT INTO photos (url, attachment) VALUES ($1, $2)",
                [photoUrl, photo.toString()]
            );

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        const cover = await this.db.get("SELECT * FROM photos WHERE url = $1", [
            photoUrl,
        ]);
        if (!cover.url) {
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
        await this.db.run(
            "INSERT INTO users_to_chat (user_id, chat_id) VALUES ($1, $2)",
            [userId, chatId]
        );
    }

    async userLeft(userId: number, chatId: number): Promise<void> {
        await this.db.run(
            "DELETE FROM users_to_chat WHERE user_id = $1 AND chat_id = $2",
            [userId, chatId]
        );
    }

    async getChatUsers(chatId: number): Promise<number[]> {
        const users = await this.db.all(
            "SELECT * FROM users_to_chat WHERE chat_id = $1",
            [chatId]
        );
        return users.map((u) => u.user_id);
    }

    async isUserInChat(userId: number, chatId: number): Promise<boolean> {
        const user = await this.db.get(
            "SELECT * FROM users_to_chat WHERE user_id = $1 AND chat_id = $2",
            [userId, chatId]
        );
        return !!user.user_id;
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
        await this.db.run("INSERT INTO ignored_users (id) VALUES ($1)", [
            userId,
        ]);
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

    async addError(
        prefix: string,
        ctx: UnifiedMessageContext,
        error: string
    ): Promise<string> {
        const code = `${prefix}.${util.hash()}`;
        const check = this.getError(code);
        if (!check) {
            return this.addError(prefix, ctx, error);
        }
        let info = `Sent by: ${ctx.senderId}; Text: ${ctx.text}`;
        if (ctx.hasReplyMessage) {
            info += `; Replied to: ${ctx.replyMessage.senderId}`;
        }
        await this.db.run(
            "INSERT INTO errors (code, info, error) VALUES ($1, $2, $3)",
            [code, info, error]
        );
        return code;
    }

    async getError(code: string): Promise<IDatabaseError | null> {
        const error = this.db.get("SELECT * FROM errors WHERE code = $1", [
            code,
        ]);
        return error;
    }

    clear() {
        this.db.run("DELETE FROM errors");
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
            await db.run(
                "CREATE TABLE IF NOT EXISTS covers (id BIGINT, attachment TEXT)"
            );
            await db.run(
                "CREATE TABLE IF NOT EXISTS photos (url TEXT, attachment TEXT)"
            );
            await db.run(
                "CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)"
            );
            await db.run(
                "CREATE TABLE IF NOT EXISTS users_to_chat (user_id BIGINT, chat_id TEXT)"
            );
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
        name: "Create table for Ignore List",
        process: async (db: Database) => {
            await db.run(
                "CREATE TABLE IF NOT EXISTS ignored_users (id BIGINT)"
            );
            return true;
        },
    },
];

async function applyMigrations(db: Database) {
    console.log("Applying migrations");
    const applied = new Set<number>();
    const dbData: IMigration[] = await db.all("SELECT version FROM migrations");
    for (const m of dbData) {
        applied.add(m.version);
    }

    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }

        console.log(
            `Processing migration #${migration.version}: ${migration.name}`
        );

        let res = false;
        try {
            res = await migration.process(db);
        } catch (e) {
            console.log(e);
        }

        if (res) {
            console.log("Success");
            await db.run("INSERT INTO migrations (version) VALUES ($1)", [
                migration.version,
            ]);
        } else {
            console.log("Failed. Aborting");
            process.abort();
            return;
        }
    }
}

export default class Database {
    servers: IServersList;
    covers: DatabaseCovers;
    errors: DatabaseErrors;
    chats: DatabaseUsersToChat;
    ignore: DatabaseIgnore;
    drop: DatabaseDrop;

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
                    resolve(res.rows[0] || {});
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
        await this.run(
            "CREATE TABLE IF NOT EXISTS migrations (version INTEGER)"
        );

        await applyMigrations(this);
    }
}
