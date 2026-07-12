import { IGameUserLink } from "games/users/IGameUserLink";
import { ILeaderboardEntry } from "games/leaderboards/ILeaderboardEntry";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { IGameApi } from "games/IGameApi";
import { IScoreRequestOptions } from "games/IScoreRequestOptions";
import { IBeatmapProvider } from "games/IBeatmapProvider";
import { Mods } from "games/osu/performance/Mods";
import { LeaderboardNotSupportedError } from "core/errors/LeaderboardNotSupportedError";
import { NoScoresFoundError } from "core/errors/NoScoresFoundError";

const BATCH_SIZE = 5;

export async function getLeaderboard(
    api: IGameApi,
    beatmapProvider: IBeatmapProvider,
    beatmapId: number,
    users: IGameUserLink[],
    mode: number = 0,
    mods?: number
): Promise<ILeaderboardResult> {
    if (!api.getScoreByUid) {
        throw new LeaderboardNotSupportedError();
    }

    const map = await beatmapProvider.getBeatmapById(beatmapId, mode);
    const scoreMods = api.supportsScoreMods ? mods : undefined;
    if (scoreMods) {
        await map.applyMods(new Mods(scoreMods));
    }

    const scores: ILeaderboardEntry[] = [];
    const scoreOptions: IScoreRequestOptions = { forceLazerScore: true };
    for (let offset = 0; offset < users.length; offset += BATCH_SIZE) {
        const batch = users.slice(offset, offset + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map((user) => api.getScoreByUid!(user.game_id, beatmapId, mode, scoreMods, scoreOptions))
        );

        for (let index = 0; index < results.length; index++) {
            const result = results[index];
            if (result.status === "fulfilled") {
                scores.push({ user: batch[index], score: result.value });
            } else if (!(result.reason instanceof NoScoresFoundError)) {
                throw result.reason;
            }
        }
    }

    return {
        map,
        scores: scores.sort((a, b) => b.score.score - a.score.score),
    };
}
