import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { IUserSettings } from "core/IUserSettings";
import { getDefaultContentOutput } from "core/ContentOutput";
import { isContentOutputSupported } from "core/ContentOutput";

export { IUserSettings } from "core/IUserSettings";

export class UserSettingsModel {
    private db: ISqlExecutor;
    private readonly cache: Map<string, { val: IUserSettings | null; expiresAt: number }> = new Map();
    private readonly ttl: number; // milliseconds
    private readonly limit: number;

    constructor(db: ISqlExecutor, ttlMinutes: number = 15, limit: number = 5000) {
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

    private setCache(userId: number, accountId: number, val: IUserSettings | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(this.cacheKey(userId, accountId), { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number, accountId: number): IUserSettings | null {
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

    private loadSettings(userId: number, accountId: number): Promise<IUserSettings | null> {
        return this.db.get<IUserSettings>(
            `SELECT settings.app_user_id AS user_id,
                    $2::BIGINT AS account_id,
                    account.platform,
                    settings.render_enabled,
                    COALESCE(account_settings.notifications_enabled, true) AS notifications_enabled,
                    COALESCE(account_settings.enable_find, true) AS enable_find,
                    COALESCE(account_settings.language_override, 'do_not_override') AS language_override,
                    account_settings.content_output,
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

    async getUserSettings(userId: number, accountId: number): Promise<IUserSettings | null> {
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
            content_output: isContentOutputSupported(res.platform, res.content_output)
                ? res.content_output
                : getDefaultContentOutput(res.platform),
        };
        this.setCache(userId, accountId, settings);
        return settings;
    }

    async updateSettings(settings: IUserSettings): Promise<void> {
        const contentOutput = isContentOutputSupported(settings.platform, settings.content_output)
            ? settings.content_output
            : getDefaultContentOutput(settings.platform);
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
                 experimental_renderer = $14
             WHERE app_user_id = $15`,
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
                settings.user_id,
            ]
        );
        await this.db.run(
            `INSERT INTO platform_account_settings
                 (platform_account_id, notifications_enabled, language_override, content_output, enable_find)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (platform_account_id) DO UPDATE
             SET notifications_enabled = EXCLUDED.notifications_enabled,
                 language_override = EXCLUDED.language_override,
                 content_output = EXCLUDED.content_output,
                 enable_find = EXCLUDED.enable_find`,
            [
                settings.account_id,
                settings.notifications_enabled,
                settings.language_override,
                contentOutput,
                settings.enable_find,
            ]
        );
        this.invalidateUser(settings.user_id);
        this.setCache(settings.user_id, settings.account_id, { ...settings, content_output: contentOutput });
    }
}
