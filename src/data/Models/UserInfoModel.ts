import Database from "../Database";

export interface IUserInfo {
    user_id: number;
    display_username?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export interface IExtendedUserInfo extends IUserInfo {
    username?: string | null;
}

export class UserInfoModel {
    private readonly db: Database;
    private readonly cache: Map<number, { val: IExtendedUserInfo | null; expiresAt: number }> = new Map();
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

    private setCache(userId: number, val: IExtendedUserInfo | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(userId, { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number): IExtendedUserInfo | null {
        const entry = this.cache.get(userId);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(userId);
            return null;
        }
        return entry.val;
    }

    async get(userId: number): Promise<IExtendedUserInfo | null> {
        const cached = this.getCache(userId);
        if (cached !== null) return cached;

        const row = await this.db.get<IExtendedUserInfo>(
            "SELECT user_id, username, display_username, first_name, last_name FROM user_info WHERE user_id = $1",
            [userId]
        );
        this.setCache(userId, row);
        return row;
    }

    async findByUsername(username: string): Promise<IExtendedUserInfo | null> {
        if (!username) return null;
        const row = await this.db.get<IExtendedUserInfo>(
            "SELECT user_id, username, display_username, first_name, last_name FROM user_info WHERE username = $1 LIMIT 1",
            [username.toLowerCase()]
        );
        return row ?? null;
    }

    async set(info: IUserInfo): Promise<void> {
        // Convert username to lowercase for storage
        const usernameLower = info.display_username ? info.display_username.toLowerCase() : null;
        const displayUsername = info.display_username ?? null;

        // If username provided, ensure it's not attached to another user
        if (usernameLower) {
            const existing = await this.db.get<{ user_id: number }>(
                "SELECT user_id FROM user_info WHERE username = $1 LIMIT 1",
                [usernameLower]
            );
            if (existing && Number(existing.user_id) !== Number(info.user_id)) {
                await this.db.run("UPDATE user_info SET username = NULL, display_username = NULL WHERE user_id = $1", [
                    existing.user_id,
                ]);
                this.cache.delete(Number(existing.user_id));
            }
        }

        await this.db.run(
            `INSERT INTO user_info (user_id, username, display_username, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO UPDATE SET username = EXCLUDED.username, display_username = EXCLUDED.display_username, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name`,
            [info.user_id, usernameLower, displayUsername, info.first_name ?? null, info.last_name ?? null]
        );

        this.setCache(Number(info.user_id), {
            user_id: Number(info.user_id),
            username: usernameLower,
            display_username: displayUsername,
            first_name: info.first_name ?? null,
            last_name: info.last_name ?? null,
        });
    }

    async getMention(userId: number): Promise<string> {
        const info = await this.get(userId);
        if (info && info.display_username) {
            return `@${info.display_username}`;
        }
        return `tg://user?id=${userId}`;
    }
}

export default UserInfoModel;
