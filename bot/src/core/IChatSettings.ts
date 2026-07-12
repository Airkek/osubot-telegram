import { LanguageOverride } from "core/Language";

export interface IChatSettings {
    chat_id: number;
    render_enabled: boolean;
    notifications_enabled: boolean;
    language_override: LanguageOverride;
}
