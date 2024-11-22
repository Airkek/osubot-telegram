import Mods from './Mods';

function approachRateToMs(approachRate: number): number {
    if (approachRate <= 5) {
        return 1800 - approachRate * 120;
    } else {
        let remainder = approachRate - 5;
        return 1200 - remainder * 150;
    }
}

function msToApproachRate(ms: number): number {
    let smallestDiff = 100000; // large initial value
    for (let AR = 0; AR <= 110; AR++) {
        const newDiff = Math.abs(this.approachRateToMs(AR / 10) - ms);
        if (newDiff < smallestDiff) {
            smallestDiff = newDiff;
        } else {
            return (AR - 1) / 10;
        }
    }
    return 300; // fallback, though it should never reach here
}

function overallDifficultyToMs(od: number): number {
    return -6 * od + 79.5;
}

function msToOverallDifficulty(ms: number): number {
    return (79.5 - ms) / 6;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export default class AttributesCalculator {
    ar: number;
    od: number;
    hp: number;
    cs: number;
    mods: Mods;

    constructor(ar: number, od: number, hp: number, cs: number, mods: Mods) {
        this.ar = ar;
        this.od = od;
        this.hp = hp;
        this.cs = cs;
        this.mods = mods;
    }

    calculateMultipliedCS(): number {
        let newCs = this.cs;

        if (this.mods.isEasy()) {
            newCs /= 2; // Easy halves CS
        }
        if (this.mods.isHardRock()) {
            newCs *= 1.3; // Hard Rock multiplies CS by 1.3
        }

        return clamp(newCs, 2, 7);
    }

    calculateMultipliedHP(): number {
        let newHp = this.hp;

        if (this.mods.isEasy()) {
            newHp /= 2; // Easy halves HP
        }
        if (this.mods.isHardRock()) {
            newHp *= 1.4; // Hard Rock multiplies HP by 1.4
        }

        return clamp(newHp, 0, 10);
    }

    calculateMultipliedAR(): number {
        const bpmMultiplier = this.mods.speed();
        let newBpmMs = approachRateToMs(this.ar) / bpmMultiplier;
        let newBpmAR = msToApproachRate(newBpmMs);
        
        if (this.mods.isEasy()) {
            newBpmAR /= 2; // Easy halves AR
        }
        if (this.mods.isHardRock()) {
            newBpmAR *= 1.4; // Hard Rock multiplies AR by 1.4
        }
        
        return clamp(newBpmAR, 0, 11);
    }

    calculateMultipliedOD(): number {
        const bpmMultiplier = this.mods.speed();
        let newBpmMs = overallDifficultyToMs(this.od) / bpmMultiplier;
        let newBpmOD = msToOverallDifficulty(newBpmMs);

        if (this.mods.isEasy()) {
            newBpmOD /= 2; // Easy halves OD
        }
        if (this.mods.isHardRock()) {
            newBpmOD *= 1.4; // Hard Rock multiplies OD by 1.4
        }

        newBpmOD = Math.round(newBpmOD * 10) / 10; // round to 1 decimal place
        return clamp(newBpmOD, 0, 11);
    }
}