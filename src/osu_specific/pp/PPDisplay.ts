const PP_DISPLAY_PRECISION = 2;

function isFiniteNumber(value: number | undefined): value is number {
    return value !== undefined && Number.isFinite(value);
}

export function ppValuesLookEqual(left: number | undefined, right: number | undefined): boolean {
    return (
        isFiniteNumber(left) &&
        isFiniteNumber(right) &&
        left.toFixed(PP_DISPLAY_PRECISION) === right.toFixed(PP_DISPLAY_PRECISION)
    );
}

export function shouldDisplayPpEstimate(
    actualPp: number | undefined,
    calculatedPp: number | undefined,
    estimatePp: number | undefined
): boolean {
    if (!isFiniteNumber(estimatePp)) {
        return false;
    }

    const comparableValues = [actualPp, calculatedPp].filter(isFiniteNumber);
    return comparableValues.length > 0 && comparableValues.every((value) => !ppValuesLookEqual(value, estimatePp));
}
