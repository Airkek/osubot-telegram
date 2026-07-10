import { APIUser, APIScore } from "../Types";
import { UserError } from "../UserError";

export class NoScoreError extends UserError {
    constructor(message: string = "No scores found") {
        super("no-scores-found", message);
        this.name = "NoScoreError";
    }
}

export interface ScoreRequestOptions {
    forceLazerScore?: boolean;
}

interface IAPI {
    readonly supportsScoreMods?: boolean;
    getUser?(nickname: string, mode?: number): Promise<APIUser>;
    getUserById(id: number | string, mode?: number): Promise<APIUser>;
    getUserTop?(nickname: string, mode?: number, limit?: number): Promise<APIScore[]>;
    getUserTopById?(id: number | string, mode?: number, limit?: number): Promise<APIScore[]>;
    getUserRecent?(nickname: string, mode?: number, limit?: number): Promise<APIScore>;
    getUserRecentById?(id: number | string, mode?: number, limit?: number): Promise<APIScore>;
    getScore?(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore>;
    getScoreByUid?(
        uid: number | string,
        beatmapId: number,
        mode?: number,
        mods?: number,
        options?: ScoreRequestOptions
    ): Promise<APIScore>;
    downloadReplay?(scoreId: number | string): Promise<Buffer>;
}

export default IAPI;
