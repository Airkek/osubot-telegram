import { IGameUser } from "games/users/IGameUser";
import { IGameUserLink } from "games/users/IGameUserLink";
import { IGameUserStats } from "games/users/IGameUserStats";

export interface IGameUserRepository {
    getUser(userId: number): Promise<IGameUserLink | null>;
    findByUserId(id: number | string): Promise<IGameUserLink[]>;
    setNickname(userId: number, gameUserId: number | string, nickname: string, mode?: number): Promise<void>;
    setMode(userId: number, mode: number): Promise<boolean>;
    updateInfo(user: IGameUser, mode: number): Promise<void>;
    getUserStats(userId: number, mode: number): Promise<IGameUserStats | null>;
}
