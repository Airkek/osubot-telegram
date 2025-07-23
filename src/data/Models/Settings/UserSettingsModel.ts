import { ContentOutput, LanguageOverride } from "./SettingsTypes";
import Database from "../../Database";

export interface UserSettings {
    user_id: number;
    render_enabled: boolean;
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
    notifications_enabled: boolean;
    experimental_renderer: boolean;
    language_override: LanguageOverride;
    content_output: ContentOutput;
}

export class UserSettingsModel {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async getUserSettings(id: number): Promise<UserSettings | null> {
        const res = await this.db.get<UserSettings>("SELECT * FROM settings WHERE user_id = $1", [id]);
        if (!res) {
            await this.db.run("INSERT INTO settings (user_id) VALUES ($1)", [id]);
            return await this.getUserSettings(id);
        }
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
                 content_output        = $17
             WHERE user_id = $18`,
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
                settings.user_id,
            ]
        );
    }
}
