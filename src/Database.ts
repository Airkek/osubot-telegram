import { Bot as TG, InputFile } from 'grammy';
import { Pool, QueryResult } from 'pg';
import util from './Util';
import { APIUser, IDatabaseUser, IDatabaseUserStats, IDatabaseServer } from './Types';
import UnifiedMessageContext from './TelegramSupport';

class DatabaseServer implements IDatabaseServer {
    serverName: String;
    db: Database;
    constructor(serverName: String, db: Database) {
        this.serverName = serverName;
        this.db = db;
    }

    async getUser(id: Number): Promise<IDatabaseUser | null> {
        try {
            let user: IDatabaseUser = await this.db.get(`SELECT * FROM users WHERE id = $1 AND server = $2`, [id, this.serverName]);
            return user;
        } catch(err) {
            throw err;
        }
    }

    async findByUserId(id: number | string): Promise<IDatabaseUser[]> {
        try {
            let users: IDatabaseUser[] = await this.db.all(`SELECT * FROM users WHERE game_id = $1 AND server = $2 COLLATE NOCASE`, [id, this.serverName]);
            return users;
        } catch(err) {
            throw err;
        }
    }

    async setNickname(id: number, game_id: number | string, nickname: String, mode: Number = 0): Promise<void> {
        try {
            let user: IDatabaseUser = await this.getUser(id);
            if (!user.id)
                await this.db.run(`INSERT INTO users (id, game_id, nickname, mode, server) VALUES ($1, $2, $3, $4, $5)`, [id, game_id, nickname, mode, this.serverName]);
            else
                await this.db.run(`UPDATE users SET nickname = $1, game_id = $2 WHERE id = $3 AND server = $4`, [nickname, game_id, id, this.serverName]);
        } catch(err) {
            throw err;
        }
    }

    async setMode(id: number, mode: number): Promise<boolean> {
        try {
            let user: IDatabaseUser = await this.getUser(id);
            if(!user)
                return false;
            await this.db.run(`UPDATE users SET mode = $1 WHERE id = $2 AND server = $3`, [mode, id, this.serverName]);
        } catch(err) {
            throw err;
        }
    }

    async updateInfo(user: APIUser, mode: number): Promise<void> {
        let dbUser = await this.db.get(`SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3 LIMIT 1`, [user.id, mode, this.serverName]);
        if(!dbUser.id)
            await this.db.run(`INSERT INTO stats (id, nickname, pp, rank, acc, mode, server) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [user.id, user.nickname, user.pp, user.rank.total, user.accuracy, mode, this.serverName]);
        else
            await this.db.run(`UPDATE stats SET nickname = $1, pp = $2, rank = $3, acc = $4 WHERE id = $5 AND mode = $6 AND server = $6`, [user.nickname, user.pp, user.rank.total, user.accuracy, user.id, mode, this.serverName]);
    }

    async getUserStats(id: number, mode: number): Promise<IDatabaseUserStats> {
        let u = await this.getUser(id);
        let stats: IDatabaseUserStats = await this.db.get(`SELECT * FROM stats WHERE id = $1 AND mode = $2 AND server = $3`, [u.game_id, mode, this.serverName]);
        return stats;
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

            await this.db.run("INSERT INTO covers (id, attachment) VALUES ($1, $2)", [id, photo.toString()]);

            return photo.toString();
        } catch(e) {
            return "";
        }
    }

    async getCover(id: Number): Promise<string> {
        let cover = await this.db.get(`SELECT * FROM covers WHERE id = $1`, [id]);
        if(!cover.id)
            return this.addCover(id);
        return cover.attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            let file = new InputFile(new URL(photoUrl))
            let send = await this.db.tg.api.sendPhoto(this.db.owner, file);
            let photo = send.photo[0].file_id;

            await this.db.run("INSERT INTO photos (url, attachment) VALUES ($1, $2)", [photoUrl, photo.toString()]);

            return photo.toString();
        } catch(e) {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        let cover = await this.db.get(`SELECT * FROM photos WHERE url = $1`, [photoUrl]);
        if(!cover.url)
            return this.addPhotoDoc(photoUrl);
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

    async userJoined(userId: Number, chatId: Number): Promise<void> {
        await this.db.run(`INSERT INTO users_to_chat (user_id, chat_id) VALUES ($1, $2)`, [userId, chatId])
    }

    async userLeft(userId: Number, chatId: Number): Promise<void> {
        await this.db.run(`DELETE FROM users_to_chat WHERE user_id = $1 AND chat_id = $2`, [userId, chatId])
    }

    async getChatUsers(chatId: Number): Promise<number[]> {
        let users = await this.db.all("SELECT * FROM users_to_chat WHERE chat_id = $1", [chatId]);
        return users.map(u => u.user);
    }

    async isUserInChat(userId: Number, chatId: Number): Promise<boolean> {
        let user = await this.db.get(`SELECT * FROM users_to_chat WHERE user_id = $1 AND chat_id = $2`, [userId, chatId]);
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
        await this.db.run(`INSERT INTO errors (code, info, error) VALUES ($1, $2, $3)`, [code, info, error]);
        return code;
    }

    async getError(code: String): Promise<IDatabaseError | null> {
        let error = this.db.get(`SELECT * FROM errors WHERE code = $1`, [code]);
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
    beatleader: DatabaseServer,
    scoresaber: DatabaseServer
}

interface IMigration {
    version: number,
    name: string,
    process: (db: Database) => Promise<boolean>;
}

const migrations : IMigration[] = [
    {
        version: 1,
        name: "Create tables",
        process: async (db: Database) => {
            await db.run("CREATE TABLE IF NOT EXISTS covers (id INTEGER, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS photos (url TEXT, attachment TEXT)");
            await db.run("CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)");
            await db.run(`CREATE TABLE IF NOT EXISTS users_to_chat (user_id INTEGER, chat_id TEXT)`);
            await db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER, game_id TEXT, nickname TEXT, mode SMALLINT, server TEXT)`);
            await db.run(`CREATE TABLE IF NOT EXISTS stats (id INTEGER, nickname TEXT, server TEXT, mode SMALLINT, pp REAL DEFAULT 0, rank INTEGER DEFAULT 9999999, acc REAL DEFAULT 100)`);
            return true;
        }
    }
]

async function applyMigrations(db: Database) {
    console.log("Applying migrations")
    const applied = new Set(await db.all("SELECT version FROM migrations"));
    console.log(applied);
    for (const migration of migrations) {
        if (applied.has(migration.version)) {
            continue;
        }

        console.log(`Processing migration #${migration.version}: ${migration.name}`);

        let res = false;
        try {
            res = await migration.process(db);
        } catch (e) {
            console.log(e);
        }

        if (res) {
            console.log("Success")
            await db.run("INSERT INTO migrations (version) VALUES ($1)", [migration.version]);
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

    db: Pool;
    tg: TG;
    owner: number
    constructor(tg: TG, owner: number) {
        this.servers = {
            bancho: new DatabaseServer("bancho", this),
            gatari: new DatabaseServer("gatari", this),
            ripple: new DatabaseServer("ripple", this),
            akatsuki: new DatabaseServer("akatsuki", this),
            beatleader: new DatabaseServer("beatleader", this),
            scoresaber: new DatabaseServer("scoresaber", this)
        }

        this.covers = new DatabaseCovers(this);
        
        this.errors = new DatabaseErrors(this);

        this.chats = new DatabaseUsersToChat(this);

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
                if (err)
                    reject(err);
                else
                    resolve(res.rows[0] || {});
            });
        });
    }

    async all(stmt: string, opts: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<any>) => {
                if (err)
                    reject(err);
                else
                    resolve(res.rows);
            });
        });
    }

    async run(stmt: string, opts: any[] = []): Promise<QueryResult<any>> {
        return new Promise((resolve, reject) => {
            this.db.query(stmt, opts, (err: Error, res: QueryResult<any>) => {
                if(err)
                    reject(err);
                else
                    resolve(res);
            });
        });
    }

    async init() {
        await this.run(`CREATE TABLE IF NOT EXISTS migrations (version INTEGER)`);

        await applyMigrations(this);
    }
}