import { IBeatmap } from "games/IBeatmap";
import { IScorePpDisplay } from "games/osu/performance/IScorePpDisplay";
import { IGameScore } from "games/scores/IGameScore";
import { ILocalizer } from "localization/ILocalizer";

export interface ITopScoreTemplate {
    (
        localizer: ILocalizer,
        score: IGameScore,
        beatmap: IBeatmap,
        place: number,
        pp: IScorePpDisplay,
        link: string
    ): string;
}
