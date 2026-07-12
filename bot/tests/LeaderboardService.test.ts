import { describe, expect, test } from "@jest/globals";
import { getLeaderboard } from "../src/application/LeaderboardService";
import { IBeatmap } from "../src/games/IBeatmap";
import { IBeatmapProvider } from "../src/games/IBeatmapProvider";
import { IGameApi } from "../src/games/IGameApi";
import { Mods } from "../src/games/osu/performance/Mods";
import { IGameScore } from "../src/games/scores/IGameScore";
import { IGameUserLink } from "../src/games/users/IGameUserLink";

describe("getLeaderboard", () => {
    test("keeps extended mod filters and stores player countries for cards", async () => {
        const users = [
            { id: 1, game_id: "10", nickname: "first", mode: 0 },
            { id: 2, game_id: "20", nickname: "second", mode: 0 },
        ] as IGameUserLink[];
        const scores = new Map<string, IGameScore>([
            ["10", { score: 100 } as IGameScore],
            ["20", { score: 200 } as IGameScore],
        ]);
        const receivedMods: Mods[] = [];
        const api = {
            supportsScoreMods: true,
            getScoreByUid: async (id: string, _beatmapId: number, _mode: number, mods: Mods) => {
                receivedMods.push(mods);
                return scores.get(id);
            },
            getUserById: async (id: string) => {
                if (id === "20") {
                    throw new Error("Profile unavailable");
                }
                return { country: "JP" };
            },
        } as unknown as IGameApi;
        let appliedMods: Mods;
        const map = {
            applyMods: async (mods: Mods) => {
                appliedMods = mods;
            },
        } as IBeatmap;
        const beatmapProvider = {
            getBeatmapById: async () => map,
        } as unknown as IBeatmapProvider;
        const mods = new Mods("TC");

        const result = await getLeaderboard(api, beatmapProvider, 123, users, 0, mods);

        expect(appliedMods).toBe(mods);
        expect(receivedMods).toHaveLength(2);
        expect(receivedMods.every((received) => received === mods)).toBe(true);
        expect(result.scores).toEqual([
            { user: users[1], score: scores.get("20"), country: undefined },
            { user: users[0], score: scores.get("10"), country: "JP" },
        ]);
    });
});
