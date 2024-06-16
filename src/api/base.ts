import * as axios from 'axios';
import { APIUser, APITopScore, APIBeatmap, APIRecentScore, APIScore, IDatabaseUser, LeaderboardResponse } from '../Types';
import { Bot } from "../Bot"

export default interface IAPI {
    token?: String,
    bot: Bot,
    api: axios.AxiosInstance,
    getUser(nickname: string, mode?: number): Promise<APIUser>,
    getUserTop(nickname: string, mode?: number, limit?: number): Promise<APITopScore[]>,
    getUserRecent(nickname: string, mode?: number, limit?: number): Promise<APIRecentScore>,
    getScore?(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore>,
    getBeatmap?(id: number | string, mode?: number, mods?: number): Promise<APIBeatmap>,
    getLeaderboard?(beatmapId: number, users: IDatabaseUser[], mode?: number): Promise<LeaderboardResponse>
}