import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { IExtendedUserInfo } from "core/storage/IExtendedUserInfo";
import { IUserInfo } from "core/storage/IUserInfo";
import { Platform } from "core/Platform";

export { IExtendedUserInfo as IExtendedUserInfo } from "core/storage/IExtendedUserInfo";
export { IUserInfo as IUserInfo } from "core/storage/IUserInfo";

export class UserInfoModel {
    private readonly db: ISqlExecutor;
    private readonly cache: Map<number, { val: IExtendedUserInfo | null; expiresAt: number }> = new Map();
    private readonly ttl: number; // milliseconds
    private readonly limit: number;

    constructor(
        db: ISqlExecutor,
        private readonly platform: Platform,
        ttlMinutes: number = 15,
        limit: number = 5000
    ) {
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
            `SELECT info.platform_account_id AS account_id,
                    info.username,
                    info.display_username,
                    info.first_name,
                    info.last_name
             FROM user_info AS info
             JOIN platform_accounts AS account ON account.id = info.platform_account_id
             WHERE info.platform_account_id = $1 AND account.platform = $2`,
            [userId, this.platform]
        );
        const info = row ? this.mapInfo(row) : null;
        this.setCache(userId, info);
        return info;
    }

    async findByUsername(username: string): Promise<IExtendedUserInfo | null> {
        if (!username) return null;
        const row = await this.db.get<IExtendedUserInfo>(
            `SELECT info.platform_account_id AS account_id,
                    info.username,
                    info.display_username,
                    info.first_name,
                    info.last_name
             FROM user_info AS info
             JOIN platform_accounts AS account ON account.id = info.platform_account_id
             WHERE info.username = $1 AND account.platform = $2
             LIMIT 1`,
            [username.toLowerCase(), this.platform]
        );
        return row ? this.mapInfo(row) : null;
    }

    async set(info: IUserInfo): Promise<void> {
        // Convert username to lowercase for storage
        const usernameLower = info.display_username ? info.display_username.toLowerCase() : null;
        const displayUsername = info.display_username ?? null;

        // If username provided, ensure it's not attached to another user
        if (usernameLower) {
            const existing = await this.db.get<{ account_id: number }>(
                `SELECT info.platform_account_id AS account_id
                 FROM user_info AS info
                 JOIN platform_accounts AS account ON account.id = info.platform_account_id
                 WHERE info.username = $1 AND account.platform = $2
                 LIMIT 1`,
                [usernameLower, this.platform]
            );
            if (existing && Number(existing.account_id) !== Number(info.account_id)) {
                await this.db.run(
                    "UPDATE user_info SET username = NULL, display_username = NULL WHERE platform_account_id = $1",
                    [existing.account_id]
                );
                this.cache.delete(Number(existing.account_id));
            }
        }

        await this.db.run(
            `INSERT INTO user_info (platform_account_id, username, display_username, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (platform_account_id) DO UPDATE
             SET username = EXCLUDED.username,
                 display_username = EXCLUDED.display_username,
                 first_name = EXCLUDED.first_name,
                 last_name = EXCLUDED.last_name`,
            [info.account_id, usernameLower, displayUsername, info.first_name ?? null, info.last_name ?? null]
        );

        this.setCache(Number(info.account_id), {
            account_id: Number(info.account_id),
            username: usernameLower,
            display_username: displayUsername,
            first_name: info.first_name ?? null,
            last_name: info.last_name ?? null,
        });
    }

    private mapInfo(info: IExtendedUserInfo): IExtendedUserInfo {
        return { ...info, account_id: Number(info.account_id) };
    }
}
