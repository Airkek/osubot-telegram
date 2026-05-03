import { ContentOutput, LanguageOverride } from "./SettingsTypes";
import Database from "../../Database";

interface BasicSettings {
    render_enabled: boolean;
    notifications_enabled: boolean;
    enable_find: boolean;
    language_override: LanguageOverride;
    content_output: ContentOutput;
}

interface RenderSettings {
    ordr_skin: string;
    ordr_video: boolean;
    ordr_storyboard: boolean;
    ordr_bgdim: number;
    ordr_pp_counter: boolean;
    ordr_ur_counter: boolean;
    ordr_hit_counter: boolean;
    ordr_strain_graph: boolean;
    ordr_is_skin_custom: boolean;
    ordr_master_volume: number;
    ordr_music_volume: number;
    ordr_effects_volume: number;
    experimental_renderer: boolean;
}

export interface UserSettings extends BasicSettings, RenderSettings {
    user_id: number;
}

export class UserSettingsModel {
    private db: Database;
    private readonly cache: Map<number, { val: UserSettings | null; expiresAt: number }> = new Map();
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

    private setCache(userId: number, val: UserSettings | null) {
        const expiresAt = Date.now() + this.ttl;
        this.cache.set(userId, { val, expiresAt });
        this.pruneIfNeeded();
    }

    private getCache(userId: number): UserSettings | null {
        const entry = this.cache.get(userId);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(userId);
            return null;
        }
        return entry.val;
    }

    async getUserSettings(userId: number): Promise<UserSettings | null> {
        const cached = this.getCache(userId);
        if (cached !== null) return cached;

        const res = await this.db.get<UserSettings>("SELECT * FROM settings WHERE user_id = $1", [userId]);
        if (!res) {
            await this.db.run("INSERT INTO settings (user_id) VALUES ($1)", [userId]);
            return await this.getUserSettings(userId);
        }
        this.setCache(userId, res);
        return res;
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
                 notifications_enabled = $14,
                 experimental_renderer = $15,
                 language_override     = $16,
                 content_output        = $17,
                 enable_find          = $18
             WHERE user_id = $19`,
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
                settings.notifications_enabled,
                settings.experimental_renderer,
                settings.language_override,
                settings.content_output,
                settings.enable_find,
                settings.user_id,
            ]
        );
        this.setCache(settings.user_id, settings);
    }
}
