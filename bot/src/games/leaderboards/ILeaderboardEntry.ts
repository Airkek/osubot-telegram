import { IGameScore } from "games/scores/IGameScore";
import { IGameUserLink } from "games/users/IGameUserLink";

export interface ILeaderboardEntry {
    user: IGameUserLink;
    score: IGameScore;
}
