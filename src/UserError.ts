import { ILocalisator, TranslationVariables } from "./ILocalisator";

export type UserErrorKey =
    | "beatmap-not-found"
    | "invalid-game-mode"
    | "leaderboard-not-supported"
    | "no-recent-scores"
    | "no-scores-found"
    | "no-top-scores"
    | "replay-not-available"
    | "user-not-found"
    | "user-statistics-unavailable";

export class UserError extends Error {
    constructor(
        public readonly translationKey: UserErrorKey,
        message: string = translationKey,
        public readonly translationVariables?: TranslationVariables
    ) {
        super(message);
        this.name = "UserError";
    }
}

export function isUserError(error: unknown, translationKey?: UserErrorKey): error is UserError {
    return error instanceof UserError && (!translationKey || error.translationKey === translationKey);
}

export function localizeError(error: unknown, localisator: ILocalisator): string {
    if (error instanceof UserError) {
        return localisator.tr(error.translationKey, error.translationVariables);
    }
    return localisator.tr("unknown-error");
}
