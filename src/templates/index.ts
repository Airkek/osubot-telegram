import User from './User';
import TopScore from './TopScore';
import TopSingle from './TopSingle';
import RecentScore from './Recent';
import Compare from './Compare';
import ReplayT from './Replay';
import Beatmap from "./Beatmap";
import PP from "./PP";
import Leaderboard from "./Leaderboard";
import Track from "./Track";
import Search from "./Search";
import { Replay } from '../Replay';
import { APIUser, APIBeatmap, APIScore, ICommandArgs, LeaderboardResponse, OsuTrackResponse, V2Beatmapset } from '../Types';
import { IPPCalculator as ICalc } from '../pp/Calculator';

interface ITemplates {
    User: (user: APIUser, mode: number, link: string) => string;
    TopScore: (score: APIScore, beatmap: APIBeatmap, place: number, calc: ICalc, link: string) => string;
    TopSingle: (score: APIScore, beatmap: APIBeatmap, user: APIUser, place: number, calc: ICalc, link: string) => string;
    RecentScore: (score: APIScore, beatmap: APIBeatmap, calc: ICalc, link: string) => string;
    Compare: (score: APIScore, beatmap: APIBeatmap, calc: ICalc) => string;
    Replay: (replay: Replay, map: APIBeatmap, calc: ICalc) => string;
    Beatmap: (map: APIBeatmap) => string;
    PP: (map: APIBeatmap, args: ICommandArgs) => string;
    Leaderboard: (leaderboard: LeaderboardResponse) => string;
    Track: (response: OsuTrackResponse) => string;
    Search: (sets: V2Beatmapset[]) => string;
}

var Templates: ITemplates = {
    User,
    TopScore,
    TopSingle,
    RecentScore,
    Compare,
    Replay: ReplayT,
    Beatmap,
    PP,
    Leaderboard,
    Track,
    Search
}

export {
    ITemplates,
    Templates
}