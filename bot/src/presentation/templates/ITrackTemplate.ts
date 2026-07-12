import { IOsuTrackResult } from "games/osu/osutrack/IOsuTrackResult";
import { ILocalizer } from "localization/ILocalizer";

export interface ITrackTemplate {
    (localizer: ILocalizer, response: IOsuTrackResult): string;
}
