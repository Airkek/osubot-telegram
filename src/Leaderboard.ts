import { IDatabaseUser, LeaderboardResponse, LeaderboardScore } from "./Types";
import IAPI, { NoScoreError, ScoreRequestOptions } from "./api/base";
import { IBeatmapProvider } from "./beatmaps/IBeatmapProvider";
import Mods from "./osu_specific/pp/Mods";
import { UserError } from "./UserError";

const BATCH_SIZE = 5;

export async function getLeaderboard(
    api: IAPI,
    beatmapProvider: IBeatmapProvider,
    beatmapId: number,
    users: IDatabaseUser[],
    mode: number = 0,
    mods?: number
): Promise<LeaderboardResponse> {
    if (!api.getScoreByUid) {
        throw new UserError("leaderboard-not-supported", "Leaderboard is not supported by this game API");
    }

    const map = await beatmapProvider.getBeatmapById(beatmapId, mode);
    const scoreMods = api.supportsScoreMods ? mods : undefined;
    if (scoreMods) {
        await map.applyMods(new Mods(scoreMods));
    }

    const scores: LeaderboardScore[] = [];
    const scoreOptions: ScoreRequestOptions = { forceLazerScore: true };
    for (let offset = 0; offset < users.length; offset += BATCH_SIZE) {
        const batch = users.slice(offset, offset + BATCH_SIZE);
        const results = await Promise.allSettled(
            batch.map((user) => api.getScoreByUid!(user.game_id, beatmapId, mode, scoreMods, scoreOptions))
        );

        for (let index = 0; index < results.length; index++) {
            const result = results[index];
            if (result.status === "fulfilled") {
                scores.push({ user: batch[index], score: result.value });
            } else if (!(result.reason instanceof NoScoreError)) {
                throw result.reason;
            }
        }
    }

    return {
        map,
        scores: scores.sort((a, b) => b.score.score - a.score.score),
    };
}
