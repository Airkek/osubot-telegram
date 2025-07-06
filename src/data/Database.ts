/* eslint-disable  @typescript-eslint/no-explicit-any */

import { Bot as TG, InputFile } from "grammy";
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

// TODO: move all classes to src/data/Models/Settings
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
    private readonly db: Database;
    private readonly tg: TG;
    private readonly owner: number;

    constructor(db: Database, tg: TG, owner: number) {
        this.db = db;
        this.tg = tg;
        this.owner = owner;
    }

    async addCover(id: number): Promise<string> {
        try {
            const file = new InputFile(new URL(`https://assets.ppy.sh/beatmaps/${id}/covers/cover@2x.jpg`));
            const send = await this.tg.api.sendPhoto(this.owner, file);
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
            const send = await this.tg.api.sendPhoto(this.owner, file);
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

export default class Database {
    // TODO: move out of there
    readonly servers: IServersList;
    readonly covers: DatabaseCovers;
    readonly errors: DatabaseErrors;
    readonly chats: DatabaseUsersToChat;
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

        this.covers = new DatabaseCovers(this, this.tg, this.owner);
        this.errors = new DatabaseErrors(this);
        this.chats = new DatabaseUsersToChat(this);
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
        await this.run("CREATE TABLE IF NOT EXISTS migrations (version INTEGER UNIQUE)");

        await applyMigrations(this);
        global.logger.info("Database initialized successfully");
    }
}
