import { APIUser, APIScore, IDatabaseUser, LeaderboardResponse } from "../Types";

interface IAPI {
    getUser?(nickname: string, mode?: number): Promise<APIUser>;
    getUserById(id: number | string, mode?: number): Promise<APIUser>;
    getUserTop?(nickname: string, mode?: number, limit?: number): Promise<APIScore[]>;
    getUserTopById?(id: number | string, mode?: number, limit?: number): Promise<APIScore[]>;
    getUserRecent?(nickname: string, mode?: number, limit?: number): Promise<APIScore>;
    getUserRecentById?(id: number | string, mode?: number, limit?: number): Promise<APIScore>;
    getScore?(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore>;
    getScoreByUid?(uid: number | string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore>;
    getLeaderboard?( // TODO: do not handle this in api
        beatmapId: number,
        users: IDatabaseUser[],
        mode?: number,
        mods?: number
    ): Promise<LeaderboardResponse>;
}

export default IAPI;
