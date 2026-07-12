import { TrackTopScore } from "games/osu/osutrack/TrackTopScore";

export interface IOsuTrackResult {
    username: string;
    mode: number;
    playcount: number;
    pp: number;
    rank: number;
    accuracy: number;
    levelup: boolean;
    highscores: TrackTopScore[];
}
