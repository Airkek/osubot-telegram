import * as axios from 'axios';
import { APIUser, APIBeatmap, APIRecentScore, APIScore, IDatabaseUser, LeaderboardResponse } from '../Types';
import { Bot } from "../Bot"

export default interface IAPI {
    token?: String,
    bot: Bot,
    api: axios.AxiosInstance,
    getUser(nickname: string, mode?: number): Promise<APIUser>,
    getUserTop(nickname: string, mode?: number, limit?: number): Promise<APIScore[]>,
    getUserRecent(nickname: string, mode?: number, limit?: number): Promise<APIRecentScore>,
    getScore?(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore>
    getLeaderboard?(beatmapId: number, users: IDatabaseUser[], mode?: number, mods?: number): Promise<LeaderboardResponse>
}