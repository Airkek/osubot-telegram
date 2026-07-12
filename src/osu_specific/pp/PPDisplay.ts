import type { APIScore } from "../../Types";
import type { IPPCalculator } from "./Calculator";

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

export interface ScorePpDisplay {
    actual?: number;
    calculated?: number;
    fc?: number;
    ss?: number;
}

export async function resolveScorePp(score: APIScore, calculator: IPPCalculator): Promise<ScorePpDisplay> {
    const apiPp = isFiniteNumber(score.pp) ? score.pp : undefined;
    if (isFiniteNumber(score.fcPp)) {
        return {
            actual: apiPp,
            calculated: apiPp,
            fc: score.fcPp,
        };
    }

    try {
        const calculated = await calculator.calculate(score);
        const calculatedPp = isFiniteNumber(calculated.pp) ? calculated.pp : undefined;
        return {
            actual: apiPp ?? calculatedPp,
            calculated: calculatedPp,
            fc: isFiniteNumber(calculated.fc) ? calculated.fc : undefined,
            ss: isFiniteNumber(calculated.ss) ? calculated.ss : undefined,
        };
    } catch (error) {
        global.logger.error("Failed to calculate score PP; using API PP when available", error);
        return { actual: apiPp };
    }
}
