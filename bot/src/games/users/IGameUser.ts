import { IGameUserGradeCounts } from "games/users/IGameUserGradeCounts";
import { IRankedPlayStatistics } from "games/users/IRankedPlayStatistics";

export interface IGameUser {
    id: number | string;
    nickname: string;
    playcount: number;
    playtime?: number;
    pp: number;
    rank: {
        total: number;
        country: number;
    };
    country: string;
    accuracy: number;
    level?: number;
    levelProgress?: number;
    total_score?: number;
    mode: number;
    grades?: IGameUserGradeCounts;
    is_supporter?: boolean;
    profileBackgroundUrl?: string;
    profileAvatarUrl?: string;
    rankedPlay?: IRankedPlayStatistics;
}
