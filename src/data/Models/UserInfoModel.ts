import { ExtendedUserInfo, UserInfo } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";

export { ExtendedUserInfo as IExtendedUserInfo, UserInfo as IUserInfo } from "../../core/ApplicationStorage";

export class UserInfoModel {
    private readonly db: SqlExecutor;
    private readonly cache: Map<number, { val: ExtendedUserInfo | null; expiresAt: number }> = new Map();
    private readonly ttl: number; // milliseconds
    private readonly limit: number;

    constructor(db: SqlExecutor, ttlMinutes: number = 15, limit: number = 5000) {
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

    private setCache(userId: number, val: ExtendedUserInfo | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(userId, { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number): ExtendedUserInfo | null {
        const entry = this.cache.get(userId);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(userId);
            return null;
        }
        return entry.val;
    }

    async get(userId: number): Promise<ExtendedUserInfo | null> {
        const cached = this.getCache(userId);
        if (cached !== null) return cached;

        const row = await this.db.get<ExtendedUserInfo>(
            "SELECT user_id, username, display_username, first_name, last_name FROM user_info WHERE user_id = $1",
            [userId]
        );
        this.setCache(userId, row);
        return row;
    }

    async findByUsername(username: string): Promise<ExtendedUserInfo | null> {
        if (!username) return null;
        const row = await this.db.get<ExtendedUserInfo>(
            "SELECT user_id, username, display_username, first_name, last_name FROM user_info WHERE username = $1 LIMIT 1",
            [username.toLowerCase()]
        );
        return row ?? null;
    }

    async set(info: UserInfo): Promise<void> {
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
}

export default UserInfoModel;
