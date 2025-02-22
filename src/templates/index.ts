import User from "./User";
import TopScore from "./TopScore";
import ScoreFull from "./ScoreFull";
import ReplayT from "./Replay";
import Beatmap from "./Beatmap";
import PP from "./PP";
import Leaderboard from "./Leaderboard";
import Track from "./Track";
import Search from "./Search";
import { Replay } from "../Replay";
import {
    APIUser,
    APIBeatmap,
    APIScore,
    ICommandArgs,
    LeaderboardResponse,
    OsuTrackResponse,
    V2Beatmapset,
} from "../Types";
import { IPPCalculator as ICalc } from "../pp/Calculator";

interface ITemplates {
    User: (user: APIUser, mode: number, link: string) => string;
    TopScore: (score: APIScore, beatmap: APIBeatmap, place: number, calc: ICalc, link: string) => string;
    ScoreFull: (score: APIScore, beatmap: APIBeatmap, calc: ICalc, link: string) => string;
    Replay: (replay: Replay, map: APIBeatmap, calc: ICalc) => string;
    Beatmap: (map: APIBeatmap) => string;
    PP: (map: APIBeatmap, args: ICommandArgs) => string;
    Leaderboard: (leaderboard: LeaderboardResponse) => string;
    Track: (response: OsuTrackResponse) => string;
    Search: (sets: V2Beatmapset[]) => string;
}

const Templates: ITemplates = {
    User,
    TopScore,
    ScoreFull,
    Replay: ReplayT,
    Beatmap,
    PP,
    Leaderboard,
    Track,
    Search,
};

export { ITemplates, Templates };
