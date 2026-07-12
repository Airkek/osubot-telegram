import { describe, expect, test } from "@jest/globals";
import { ILeaderboardResult } from "../src/games/leaderboards/ILeaderboardResult";
import { Mods } from "../src/games/osu/performance/Mods";
import { LeaderboardCache } from "../src/infrastructure/cache/LeaderboardCache";

describe("LeaderboardCache", () => {
    test("creates a distinct ID for identical leaderboards", () => {
        const ids = ["0000000000000001", "0000000000000002"];
        const cache = new LeaderboardCache(600_000, 60_000, 100, Date.now, () => ids.shift());
        const result = {} as ILeaderboardResult;

        const first = cache.create(10, "Bancho", 1, 0, new Mods("NM"), true, result);
        const second = cache.create(10, "Bancho", 1, 0, new Mods("NM"), true, result);

        expect(first.id).not.toBe(second.id);
    });

    test("expires snapshots after fifteen minutes without sliding the TTL", () => {
        let now = 1_000;
        const cache = new LeaderboardCache(
            900_000,
            60_000,
            100,
            () => now,
            () => "0000000000000001"
        );
        const snapshot = cache.create(20, "Bancho", 2, 0, undefined, false, {} as ILeaderboardResult);

        now += 899_999;
        expect(cache.get(snapshot.id, 20, "Bancho")).toBe(snapshot);
        now += 1;
        expect(cache.get(snapshot.id, 20, "Bancho")).toBeUndefined();
    });

    test("does not expose snapshots to another chat or server", () => {
        const cache = new LeaderboardCache(600_000, 60_000, 100, Date.now, () => "0000000000000001");
        const snapshot = cache.create(30, "Bancho", 3, 0, undefined, true, {} as ILeaderboardResult);

        expect(cache.get(snapshot.id, 31, "Bancho")).toBeUndefined();
        expect(cache.get(snapshot.id, 30, "Gatari")).toBeUndefined();
    });

    test("keeps request metadata with its cached result", () => {
        const cache = new LeaderboardCache(600_000, 60_000, 100, Date.now, () => "0000000000000001");
        const result = {} as ILeaderboardResult;
        const snapshot = cache.create(40, "Bancho", 4, 3, new Mods("TC"), true, result);

        expect(snapshot.result).toBe(result);
        expect(snapshot.mods.toExtendedMods()).toEqual([{ acronym: "TC" }]);
    });

    test("rate limits regular requests per chat and lets admins bypass it", () => {
        let now = 0;
        const cache = new LeaderboardCache(600_000, 60_000, 100, () => now);

        expect(cache.acquireRateLimit(50, false)).toBe(0);
        now = 10_000;
        expect(cache.acquireRateLimit(50, false)).toBe(50_000);
        expect(cache.acquireRateLimit(50, true)).toBe(0);
        expect(cache.acquireRateLimit(51, false)).toBe(0);

        now = 60_000;
        expect(cache.acquireRateLimit(50, false)).toBe(0);
    });
});
