import { IBeatmapTemplate } from "presentation/templates/IBeatmapTemplate";
import { ILeaderboardTemplate } from "presentation/templates/ILeaderboardTemplate";
import { IPerformanceTemplate } from "presentation/templates/IPerformanceTemplate";
import { IScoreFullTemplate } from "presentation/templates/IScoreFullTemplate";
import { ISearchTemplate } from "presentation/templates/ISearchTemplate";
import { ITopScoreTemplate } from "presentation/templates/ITopScoreTemplate";
import { ITrackTemplate } from "presentation/templates/ITrackTemplate";
import { IUserTemplate } from "presentation/templates/IUserTemplate";

export interface ITemplateStorage {
    readonly User: IUserTemplate;
    readonly TopScore: ITopScoreTemplate;
    readonly ScoreFull: IScoreFullTemplate;
    readonly Beatmap: IBeatmapTemplate;
    readonly PP: IPerformanceTemplate;
    readonly Leaderboard: ILeaderboardTemplate;
    readonly Track: ITrackTemplate;
    readonly Search: ISearchTemplate;
}
