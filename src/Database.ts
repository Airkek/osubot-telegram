import sqlite from 'sqlite3';
import { Bot as TG, InputFile } from 'grammy'
import axios from 'axios';
import util from './Util';
import { APIUser, IDatabaseUser, IDatabaseUserStats, IDatabaseServer } from './Types';
import UnifiedMessageContext from './TelegramSupport';

class DatabaseServer implements IDatabaseServer {
    table: String;
    db: Database;
    constructor(table: String, db: Database) {
        this.table = table;
        this.db = db;
    }

    async getUser(id: Number): Promise<IDatabaseUser | null> {
        try {
            let user: IDatabaseUser = await this.db.get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
            return user;
        } catch(err) {
            throw err;
        }
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        try {
            let users: IDatabaseUser[] = await this.db.all(`SELECT * FROM ${this.table} WHERE uid = ? COLLATE NOCASE`, [id]);
            return users;
        } catch(err) {
            throw err;
        }
    }

    async setNickname(id: number, uid: number | string, nickname: String): Promise<void> {
        try {
            let user: IDatabaseUser = await this.getUser(id);
            if(!user.id)
                await this.db.run(`INSERT INTO ${this.table} (id, uid, nickname, mode) VALUES (?, ?, ?, 0)`, [id, uid, nickname]);
            else
                await this.db.run(`UPDATE ${this.table} SET nickname = ?, uid = ? WHERE id = ?`, [nickname, uid, id]);
        } catch(err) {
            throw err;
        }
    }

    async setMode(id: number, mode: number): Promise<boolean> {
        try {
            let user: IDatabaseUser = await this.getUser(id);
            if(!user)
                return false;
            await this.db.run(`UPDATE ${this.table} SET mode = ? WHERE id = ?`, [mode, id]);
        } catch(err) {
            throw err;
        }
    }

    async updateInfo(user: APIUser, mode: number): Promise<void> {
        let dbUser = await this.db.get(`SELECT * FROM ${this.table}_stats_${mode} WHERE id = ? LIMIT 1`, [user.id]);
        if(!dbUser.id)
            await this.db.run(`INSERT INTO ${this.table}_stats_${mode} (id, nickname, pp, rank, acc) VALUES (?, ?, ?, ?, ?)`, [user.id, user.nickname, user.pp, user.rank.total, user.accuracy]);
        else
            await this.db.run(`UPDATE ${this.table}_stats_${mode} SET nickname = ?, pp = ?, rank = ?, acc = ? WHERE id = ?`, [user.nickname, user.pp, user.rank.total, user.accuracy, user.id]);
    }

    async getUserStats(id: number, mode: number): Promise<IDatabaseUserStats> {
        let u = await this.getUser(id);
        let stats: IDatabaseUserStats = await this.db.get(`SELECT * FROM ${this.table}_stats_${mode} WHERE id = ?`, [u.uid]);
        return stats;
    }

    async applyMigrations(): Promise<void> {
        let applied = await this.db.all(`SELECT * FROM migrations_${this.table}`);

        if (!applied.includes(1)) {
            await this.db.run(
                `CREATE TABLE IF NOT EXISTS temp_${this.table} (
                  id INTEGER,
                  uid TEXT,
                  nickname TEXT,
                  mode INTEGER
                )`
            );
        
            await this.db.run(
                `INSERT INTO temp_${this.table} (id, uid, nickname, mode)
                SELECT id, uid, nickname, mode FROM ${this.table}`
            );
        
            await this.db.run(
                `DROP TABLE ${this.table}`
            );
        
            await this.db.run(
                `ALTER TABLE temp_${this.table} RENAME TO ${this.table}`
            );

            await this.db.run(`INSERT INTO migrations_${this.table} (id) VALUES (1)`);
        }
    }

    async createTables(): Promise<void> {
        await this.db.run(`CREATE TABLE IF NOT EXISTS migrations_${this.table} (version INGEGER)`);
        await this.db.run(`CREATE TABLE IF NOT EXISTS ${this.table} (id INTEGER, uid INTEGER, nickname TEXT, mode INTEGER)`);
        for(let i = 0; i < 4; i++)
            await this.db.run(`CREATE TABLE IF NOT EXISTS ${this.table}_stats_${i} (id INTEGER, nickname TEXT, pp REAL DEFAULT 0, rank INTEGER DEFAULT 9999999, acc REAL DEFAULT 100)`);

        await this.applyMigrations();
    }
}

class DatabaseCovers {
    db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    async addCover(id: Number): Promise<string> {
        try {
            let file = new InputFile(new URL(`https://assets.ppy.sh/beatmaps/${id}/covers/raw.jpg`))
            let send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            let photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO covers (id, attachment) VALUES (?, ?)", [id, photo.toString()]);

            return photo.toString();
        } catch(e) {
            return "";
        }
    }

    async getCover(id: Number): Promise<string> {
        let cover = await this.db.get(`SELECT * FROM covers WHERE id = ?`, [id]);
        if(!cover.id)
            return this.addCover(id);
        return cover.attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            let file = new InputFile(new URL(photoUrl))
            let send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            let photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO covers (id, attachment) VALUES (?, ?)", [photoUrl, photo.toString()]);

            return photo.toString();
        } catch(e) {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        let cover = await this.db.get(`SELECT * FROM photos WHERE url = ?`, [photoUrl]);
        if(!cover.id)
            return this.addPhotoDoc(photoUrl);
        return cover.attachment;
    }

    async removeEmpty() {
        await this.db.run("DELETE FROM covers WHERE attachment = ?", [""]);
        await this.db.run("DELETE FROM photos WHERE attachment = ?", [""]);
    }
}

class DatabaseUsersToChat {
    db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    async userJoined(userId: number, chatId: number): Promise<void> {
        await this.db.run("INSERT INTO users_to_chat (user, chat) VALUES (?, ?)", [userId, chatId])
    }

    async userLeft(userId: number, chatId: number): Promise<void> {
        await this.db.run("DELETE FROM users_to_chat WHERE user = ? AND chat = ?", [userId, chatId])
    }

    async getChatUsers(chatId: Number): Promise<number[]> {
        let users = await this.db.all("SELECT * FROM users_to_chat WHERE chat = ?", [chatId]);
        return users.map(u => u.user);
    }

    async isUserInChat(userId: number, chatId: number): Promise<boolean> {
        let user = await this.db.get("SELECT * FROM users_to_chat WHERE user = ? AND chat = ?", [userId, chatId]);
        return user.user ? true : false;
    }
}

interface IDatabaseError {
    code: String,
    info: String,
    error: String
}

class DatabaseErrors {
    db: Database;
    constructor(db: Database) {
        this.db = db;
    }

    async addError(prefix: String, ctx: UnifiedMessageContext, error: String): Promise<String> {
        let code = `${prefix}.${util.hash()}`;
        let check = this.getError(code);
        if(!check)
            return this.addError(prefix, ctx,error);
        let info = `Sent by: ${ctx.senderId}; Text: ${ctx.text}`;
        if(ctx.hasReplyMessage)
            info += `; Replied to: ${ctx.replyMessage.senderId}`;
        if(ctx.hasForwards)
            info += `; Forward: ${ctx.forwards[0].senderId}`;
        await this.db.run(`INSERT INTO errors (code, info, error) VALUES (?, ?, ?)`, [code, info, error]);
        return code;
    }

    async getError(code: String): Promise<IDatabaseError | null> {
        let error = this.db.get(`SELECT * FROM errors WHERE code = ?`, [code]);
        return error;
    }

    clear() {
        this.db.run("DELETE FROM errors");
    }
}

interface IServersList {
    bancho: DatabaseServer,
    gatari: DatabaseServer,
    ripple: DatabaseServer,
    akatsuki: DatabaseServer,
    saber: DatabaseServer,
}

export default class Database {
    servers: IServersList;
    covers: DatabaseCovers;
    errors: DatabaseErrors;
    chats: DatabaseUsersToChat;

    db: sqlite.Database;
    tg: TG;
    owner: number
    constructor(tg: TG, owner: number) {
        this.servers = {
            bancho: new DatabaseServer("bancho", this),
            gatari: new DatabaseServer("gatari", this),
            ripple: new DatabaseServer("ripple", this),
            akatsuki: new DatabaseServer("akatsuki", this),
            saber: new DatabaseServer("beatleader", this)
        }

        this.covers = new DatabaseCovers(this);
        
        this.errors = new DatabaseErrors(this);

        this.chats = new DatabaseUsersToChat(this);

        this.db = new sqlite.Database("osu.db");

        this.tg = tg;
        this.owner = owner; 
    }

    async get(stmt: string, opts: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(stmt, opts, (err: Error, row: any) => {
                if(err)
                    reject(err);
                else
                    resolve(row || {});
            });
        });
    }

    async all(stmt: string, opts: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(stmt, opts, (err: Error, rows: any[]) => {
                if(err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }

    async run(stmt: string, opts: any[] = []): Promise<sqlite.RunResult> {
        return new Promise((resolve, reject) => {
            this.db.run(stmt, opts, (res: sqlite.RunResult, err: Error) => {
                if(err)
                    reject(err);
                else
                    resolve(res);
            });
        });
    }
}