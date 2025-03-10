import User from "./User";
import TopScore from "./TopScore";
import ScoreFull from "./ScoreFull";
import ReplayT from "./Replay";
import Beatmap from "./Beatmap";
import PP from "./PP";
import Leaderboard from "./Leaderboard";
import Track from "./Track";
import Search from "./Search";
import { OsrReplay } from "../../osu_specific/OsrReplay";
import { APIUser, APIScore, LeaderboardResponse, OsuTrackResponse, V2Beatmapset } from "../../Types";
import { IPPCalculator as ICalc } from "../../osu_specific/pp/Calculator";
import { IBeatmap } from "../../beatmaps/BeatmapTypes";
import { ICommandArgs } from "../Command";

interface ITemplates {
    User: (user: APIUser, mode: number, link: string) => string;
    TopScore: (score: APIScore, beatmap: IBeatmap, place: number, calc: ICalc, link: string) => string;
    ScoreFull: (score: APIScore, beatmap: IBeatmap, calc: ICalc, link: string) => string;
    Replay: (replay: OsrReplay, map: IBeatmap, calc: ICalc) => string;
    Beatmap: (map: IBeatmap) => string;
    PP: (map: IBeatmap, args: ICommandArgs) => string;
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
