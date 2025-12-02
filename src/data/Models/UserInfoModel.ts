import Database from "../Database";

export interface IUserInfo {
    user_id: number;
    username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export class UserInfoModel {
    private readonly db: Database;
    private readonly cache: Map<number, { val: IUserInfo | null; expiresAt: number }> = new Map();
    private readonly ttl: number; // milliseconds
    private readonly limit: number;

    constructor(db: Database, ttlMinutes: number = 15, limit: number = 5000) {
        this.db = db;
        this.ttl = ttlMinutes * 60 * 1000;
        this.limit = limit;
    }

    private pruneIfNeeded() {
        if (this.cache.size <= this.limit) return;
        const keys = this.cache.keys();
        while (this.cache.size > this.limit) {
            const k = keys.next().value;
            if (k === undefined) break;
            this.cache.delete(k);
        }
    }

    private setCache(userId: number, val: IUserInfo | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(userId, { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number): IUserInfo | null {
        const entry = this.cache.get(userId);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(userId);
            return null;
        }
        return entry.val;
    }

    async get(userId: number): Promise<IUserInfo | null> {
        const cached = this.getCache(userId);
        if (cached !== null) return cached;

        const row = await this.db.get<IUserInfo>(
            "SELECT user_id, username, first_name, last_name FROM user_info WHERE user_id = $1",
            [userId]
        );
        this.setCache(userId, row);
        return row;
    }

    async findByUsername(username: string): Promise<number | null> {
        if (!username) return null;
        const row = await this.db.get<{ user_id: number }>(
            "SELECT user_id FROM user_info WHERE username = $1 LIMIT 1",
            [username]
        );
        return row ? Number(row.user_id) : null;
    }

    async set(info: IUserInfo): Promise<void> {
        // If username provided, ensure it's not attached to another user
        if (info.username) {
            const existing = await this.db.get<{ user_id: number }>(
                "SELECT user_id FROM user_info WHERE username = $1 LIMIT 1",
                [info.username]
            );
            if (existing && Number(existing.user_id) !== Number(info.user_id)) {
                await this.db.run("UPDATE user_info SET username = NULL WHERE user_id = $1", [existing.user_id]);
                this.cache.delete(Number(existing.user_id));
            }
        }

        await this.db.run(
            `INSERT INTO user_info (user_id, username, first_name, last_name)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
            [info.user_id, info.username ?? null, info.first_name ?? null, info.last_name ?? null]
        );

        this.setCache(Number(info.user_id), {
            user_id: Number(info.user_id),
            username: info.username ?? null,
            first_name: info.first_name ?? null,
            last_name: info.last_name ?? null,
        });
    }

    async getMention(userId: number): Promise<string> {
        const info = await this.get(userId);
        if (info && info.username) {
            return `@${info.username}`;
        }
        return `tg://user?id=${userId}`;
    }
}

export default UserInfoModel;
