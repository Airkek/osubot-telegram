import { ContentOutput } from "./ContentOutput";
import { Platform } from "./Identity";

export type Language = "ru" | "en" | "zh";
export type LanguageOverride = Language | "do_not_override";
export type { ContentOutput } from "./ContentOutput";

export interface UserSettings {
    user_id: number;
    account_id: number;
    platform: Platform;
    render_enabled: boolean;
    notifications_enabled: boolean;
    enable_find: boolean;
    language_override: LanguageOverride;
    content_output: ContentOutput;
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

export interface ChatSettings {
    chat_id: number;
    render_enabled: boolean;
    notifications_enabled: boolean;
    language_override: LanguageOverride;
}
