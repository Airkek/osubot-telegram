import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IScoreRequestOptions } from "games/IScoreRequestOptions";
import { Mods } from "games/osu/performance/Mods";

export interface IGameApi {
    readonly supportsScoreMods?: boolean;
    getUser?(nickname: string, mode?: number): Promise<IGameUser>;
    getUserById(id: number | string, mode?: number): Promise<IGameUser>;
    getUserTop?(nickname: string, mode?: number, limit?: number): Promise<IGameScore[]>;
    getUserTopById?(id: number | string, mode?: number, limit?: number): Promise<IGameScore[]>;
    getUserRecent?(nickname: string, mode?: number, limit?: number): Promise<IGameScore>;
    getUserRecentById?(id: number | string, mode?: number, limit?: number): Promise<IGameScore>;
    getScore?(nickname: string, beatmapId: number, mode?: number, mods?: Mods): Promise<IGameScore>;
    getScoreByUid?(
        uid: number | string,
        beatmapId: number,
        mode?: number,
        mods?: Mods,
        options?: IScoreRequestOptions
    ): Promise<IGameScore>;
    downloadReplay?(scoreId: number | string): Promise<Buffer>;
}
