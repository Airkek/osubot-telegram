import { TranslationVariables } from "localization/ILocalizer";

export type ErrorTranslationKey =
    | "beatmap-not-found"
    | "invalid-game-mode"
    | "leaderboard-not-supported"
    | "no-recent-scores"
    | "no-scores-found"
    | "no-top-scores"
    | "replay-not-available"
    | "user-not-found"
    | "user-statistics-unavailable"
    | "video-send-failed";

export class CustomError extends Error {
    constructor(
        message: string,
        public readonly translationKey?: ErrorTranslationKey,
        public readonly translationVariables?: TranslationVariables
    ) {
        super(message);
        this.name = new.target.name;
    }
}
