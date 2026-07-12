import { ILocalizer } from "localization/ILocalizer";
import { IDisplayHitCount } from "games/scores/IDisplayHitCount";
import { IHitCounts } from "games/scores/IHitCounts";
import { IHitStatistics } from "games/scores/IHitStatistics";

export class HitCounts implements IHitCounts {
    readonly hitData: IHitStatistics;

    constructor(
        hits: IHitStatistics,
        readonly mode: number
    ) {
        this.hitData = hits;
    }

    totalHits(): number {
        switch (this.mode) {
            case 1:
                return this.hitData[300] + this.hitData[100] + this.hitData[50] + this.hitData.miss;
            case 2:
                return (
                    this.hitData[300] +
                    this.hitData[100] +
                    this.hitData[50] +
                    this.hitData.miss +
                    (this.hitData.katu ?? 0)
                );
            case 3:
                return (
                    (this.hitData.geki ?? 0) +
                    (this.hitData.katu ?? 0) +
                    this.hitData[300] +
                    this.hitData[100] +
                    this.hitData[50] +
                    this.hitData.miss
                );
            default:
                return this.hitData[300] + this.hitData[100] + this.hitData[50] + this.hitData.miss;
        }
    }

    toString(): string {
        switch (this.mode) {
            case 0:
            case 1:
            case 2:
                return `${this.hitData[300]}/${this.hitData[100]}/${this.hitData[50]}/${this.hitData.miss}`;
            case 3:
                return `${this.hitData.geki}/${this.hitData[300]}/${this.hitData.katu}/${this.hitData[100]}/${this.hitData[50]}/${this.hitData.miss}`;
            default:
                return "";
        }
    }

    getCountNames(localizer: ILocalizer): IDisplayHitCount[] {
        return [
            ...(this.mode === 3 ? [{ name: "320", value: this.hitData.geki ?? 0 }] : []),
            { name: "300", value: this.hitData[300] },
            ...(this.mode === 3 ? [{ name: "200", value: this.hitData.katu ?? 0 }] : []),
            { name: "100", value: this.hitData[100] },
            { name: "50", value: this.hitData[50] },
            this.getMissLikeValue(localizer),
        ];
    }

    getMissLikeValue(localizer: ILocalizer): IDisplayHitCount {
        return {
            name: localizer.tr("score-misses"),
            value: this.hitData.miss,
        };
    }
}
