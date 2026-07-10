import { UserSettings } from "../../../core/Settings";
import { SqlExecutor } from "../../SqlExecutor";

export { UserSettings } from "../../../core/Settings";

export class UserSettingsModel {
    private db: SqlExecutor;
    private readonly cache: Map<string, { val: UserSettings | null; expiresAt: number }> = new Map();
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

    private cacheKey(userId: number, accountId: number): string {
        return `${userId}:${accountId}`;
    }

    private setCache(userId: number, accountId: number, val: UserSettings | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(this.cacheKey(userId, accountId), { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number, accountId: number): UserSettings | null {
        const key = this.cacheKey(userId, accountId);
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.val;
    }

    private invalidateUser(userId: number): void {
        const prefix = `${userId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    private loadSettings(userId: number, accountId: number): Promise<UserSettings | null> {
        return this.db.get<UserSettings>(
            `SELECT settings.app_user_id AS user_id,
                    $2::BIGINT AS account_id,
                    settings.render_enabled,
                    COALESCE(account_settings.notifications_enabled, true) AS notifications_enabled,
                    settings.enable_find,
                    COALESCE(account_settings.language_override, 'do_not_override') AS language_override,
                    settings.content_output,
                    settings.ordr_skin,
                    settings.ordr_video,
                    settings.ordr_storyboard,
                    settings.ordr_bgdim,
                    settings.ordr_pp_counter,
                    settings.ordr_ur_counter,
                    settings.ordr_hit_counter,
                    settings.ordr_strain_graph,
                    settings.ordr_is_skin_custom,
                    settings.ordr_master_volume,
                    settings.ordr_music_volume,
                    settings.ordr_effects_volume,
                    settings.experimental_renderer
             FROM settings
             JOIN platform_accounts AS account
               ON account.id = $2
              AND account.user_id = settings.app_user_id
             LEFT JOIN platform_account_settings AS account_settings
               ON account_settings.platform_account_id = $2
             WHERE settings.app_user_id = $1`,
            [userId, accountId]
        );
    }

    async getUserSettings(userId: number, accountId: number): Promise<UserSettings | null> {
        const cached = this.getCache(userId, accountId);
        if (cached !== null) return cached;

        let res = await this.loadSettings(userId, accountId);
        if (!res) {
            await this.db.run("INSERT INTO settings (app_user_id) VALUES ($1) ON CONFLICT (app_user_id) DO NOTHING", [
                userId,
            ]);
            res = await this.loadSettings(userId, accountId);
            if (!res) {
                return null;
            }
        }
        const settings = {
            ...res,
            user_id: Number(res.user_id),
            account_id: Number(res.account_id),
        };
        this.setCache(userId, accountId, settings);
        return settings;
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
                 ordr_master_volume    = $11,
                 ordr_music_volume     = $12,
                 ordr_effects_volume   = $13,
                 experimental_renderer = $14,
                 content_output        = $15,
                 enable_find           = $16
             WHERE app_user_id = $17`,
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
                settings.ordr_master_volume,
                settings.ordr_music_volume,
                settings.ordr_effects_volume,
                settings.experimental_renderer,
                settings.content_output,
                settings.enable_find,
                settings.user_id,
            ]
        );
        await this.db.run(
            `INSERT INTO platform_account_settings
                 (platform_account_id, notifications_enabled, language_override)
             VALUES ($1, $2, $3)
             ON CONFLICT (platform_account_id) DO UPDATE
             SET notifications_enabled = EXCLUDED.notifications_enabled,
                 language_override = EXCLUDED.language_override`,
            [settings.account_id, settings.notifications_enabled, settings.language_override]
        );
        this.invalidateUser(settings.user_id);
        this.setCache(settings.user_id, settings.account_id, settings);
    }
}
