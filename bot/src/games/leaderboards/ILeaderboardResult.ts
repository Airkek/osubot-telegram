import { IBeatmap } from "games/IBeatmap";
import { ILeaderboardEntry } from "games/leaderboards/ILeaderboardEntry";

export interface ILeaderboardResult {
    map: IBeatmap;
    scores: ILeaderboardEntry[];
}
