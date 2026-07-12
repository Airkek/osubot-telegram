import { ILocalizer } from "localization/ILocalizer";
import { CustomError } from "core/errors/CustomError";

export function localizeError(error: unknown, localizer: ILocalizer): string {
    if (error instanceof CustomError && error.translationKey) {
        return localizer.tr(error.translationKey, error.translationVariables);
    }
    return localizer.tr("unknown-error");
}
