import User from "./User";
import TopScore from "./TopScore";
import ScoreFull from "./ScoreFull";
import Beatmap from "./Beatmap";
import PP from "./PP";
import Leaderboard from "./Leaderboard";
import Track from "./Track";
import Search from "./Search";
import { APIUser, APIScore, LeaderboardResponse, OsuTrackResponse, V2Beatmapset, PPArgs } from "../../Types";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ILocalisator } from "../../ILocalisator";

interface ITemplates {
    User: (l: ILocalisator, user: APIUser, link: string) => string;
    TopScore: (l: ILocalisator, score: APIScore, beatmap: IBeatmap, place: number, calc: ICalc, link: string) => string;
    ScoreFull: (l: ILocalisator, score: APIScore, beatmap: IBeatmap, calc: ICalc, link: string) => string;
    Beatmap: (l: ILocalisator, map: IBeatmap) => string;
    PP: (l: ILocalisator, map: IBeatmap, args: PPArgs) => string;
    Leaderboard: (l: ILocalisator, leaderboard: LeaderboardResponse) => string;
    Track: (l: ILocalisator, response: OsuTrackResponse) => string;
    Search: (sets: V2Beatmapset[]) => string;
}

const Templates: ITemplates = {
    User,
    TopScore,
    ScoreFull,
    Beatmap,
    PP,
    Leaderboard,
    Track,
    Search,
};

export { ITemplates, Templates };
