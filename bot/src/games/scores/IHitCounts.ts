import { ILocalizer } from "localization/ILocalizer";
import { IDisplayHitCount } from "games/scores/IDisplayHitCount";
import { IHitStatistics } from "games/scores/IHitStatistics";

export interface IHitCounts {
    readonly hitData?: IHitStatistics | unknown;
    totalHits(): number;
    toString(): string;
    getCountNames(localizer: ILocalizer): IDisplayHitCount[];
    getMissLikeValue(localizer: ILocalizer): IDisplayHitCount;
}
