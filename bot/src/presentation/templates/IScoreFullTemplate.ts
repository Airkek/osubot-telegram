import { IBeatmap } from "games/IBeatmap";
import { IScorePpDisplay } from "games/osu/performance/IScorePpDisplay";
import { IGameScore } from "games/scores/IGameScore";
import { ILocalizer } from "localization/ILocalizer";

export interface IScoreFullTemplate {
    (localizer: ILocalizer, score: IGameScore, beatmap: IBeatmap, pp: IScorePpDisplay, link: string): string;
}
