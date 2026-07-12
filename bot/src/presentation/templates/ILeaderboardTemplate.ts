import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { ILocalizer } from "localization/ILocalizer";

export interface ILeaderboardTemplate {
    (localizer: ILocalizer, leaderboard: ILeaderboardResult, startNumber?: number): string;
}
