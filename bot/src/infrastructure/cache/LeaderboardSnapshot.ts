import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { Mods } from "games/osu/performance/Mods";

export class LeaderboardSnapshot {
    constructor(
        readonly id: string,
        readonly chatId: number,
        readonly serverName: string,
        readonly beatmapId: number,
        readonly mode: number,
        readonly mods: Mods | undefined,
        readonly useCards: boolean,
        readonly expiresAt: number,
        public result: ILeaderboardResult | undefined
    ) {}
}
