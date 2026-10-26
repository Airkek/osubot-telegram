import axios from "axios";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { NoScoresFoundError } from "../src/core/errors/NoScoresFoundError";
import { UserNotFoundError } from "../src/core/errors/UserNotFoundError";
import { Mods } from "../src/games/osu/performance/Mods";
import { G0v0ApiClient } from "../src/games/osu/server/g0v0/G0v0ApiClient";
import { BanchoV2ApiClient } from "../src/games/osu/server/bancho/BanchoV2ApiClient";
import { IOsuV2Score } from "../src/games/osu/server/v2/IOsuV2Score";
import { formatUser } from "../src/presentation/templates/legacy-text/User";

const server = "https://morasooma.net";
const userData = {
    id: 130,
    username: "player name",
    country_code: "FI",
    avatar_url: "/api/private/default-avatar.png",
    cover: { url: "" },
    playmode: "osu",
    statistics: {
        play_count: 2397,
        play_time: 164568,
        pp: 15901.8,
        global_rank: 1,
        country_rank: 1,
        hit_accuracy: 97.5161,
        level: { current: 96, progress: 20 },
    },
};

function scoreData(id: number, mods: string[], totalScore = 300000): IOsuV2Score {
    return {
        id,
        mods: mods.map((acronym) => ({ acronym })),
        accuracy: 0.973816,
        statistics: { great: 621, ok: 20, meh: 1, miss: 4 },
        ruleset_id: 0,
        ended_at: "2026-10-20T21:30:28Z",
        rank: "A",
        total_score: totalScore,
        legacy_total_score: 0,
        max_combo: 323,
        beatmap: { id: 1782390 },
        passed: true,
        user_id: 255,
        has_replay: true,
    };
}

function httpError(status: number) {
    return Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status } });
}

function mockTokens() {
    return jest.spyOn(axios, "post").mockResolvedValue({ data: { access_token: "public-token", expires_in: 86400 } });
}

afterEach(() => jest.restoreAllMocks());

describe("g0v0 public authentication", () => {
    test("shares a lazy public token between concurrent profile requests", async () => {
        const tokenRequest = mockTokens();
        const client = new G0v0ApiClient(server);
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: userData }));
        client.api.get = request as never;

        expect(tokenRequest).not.toHaveBeenCalled();
        const [byName, byId] = await Promise.all([client.getUser("player name", 0), client.getUserById(130, 0)]);

        expect(client.api.defaults.baseURL).toBe(`${server}/api/v2`);
        expect(tokenRequest).toHaveBeenCalledTimes(1);
        expect(tokenRequest).toHaveBeenCalledWith(`${server}/web-auth/public-token`, undefined, { timeout: 15000 });
        expect(request.mock.calls).toHaveLength(2);
        expect(byName.nickname).toBe("player name");
        expect(byId.profileAvatarUrl).toBe(`${server}/api/private/default-avatar.png`);
        expect(byId.profileUrl).toBe(`${server}/users/130`);
        expect(formatUser({ tr: (key) => key }, byId, server)).toContain(`${server}/users/130`);
    });

    test("renews the token before expiry", async () => {
        const tokenRequest = mockTokens();
        const now = jest.spyOn(Date, "now").mockReturnValue(100000);
        const client = new G0v0ApiClient(server);
        client.api.get = jest.fn(async () => ({ data: userData })) as never;

        await client.getUserById(130);
        now.mockReturnValue(100000 + 86400 * 1000 - 30000);
        await client.getUserById(130);

        expect(tokenRequest).toHaveBeenCalledTimes(2);
    });

    test("refreshes a rejected token and retries replay download on the same server", async () => {
        const tokenRequest = mockTokens();
        const client = new G0v0ApiClient(server);
        const replay = Buffer.from("replay data");
        const request = jest
            .fn<(...args: unknown[]) => Promise<{ data: Buffer }>>()
            .mockRejectedValueOnce(httpError(401))
            .mockResolvedValueOnce({ data: replay });
        client.api.get = request as never;

        expect(await client.downloadReplay(213468)).toEqual(replay);
        expect(tokenRequest).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenLastCalledWith("/scores/213468/download", {
            headers: { Authorization: "Bearer public-token", "x-api-version": "20241130" },
            responseType: "arraybuffer",
        });
    });

    test("does not refresh forever when a server keeps returning HTTP 401", async () => {
        const tokenRequest = mockTokens();
        const client = new G0v0ApiClient(server);
        const error = httpError(401);
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => {
            throw error;
        });
        client.api.get = request as never;

        await expect(client.getUserById(130)).rejects.toBe(error);
        expect(tokenRequest).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenCalledTimes(2);
    });

    test("retries authentication after an invalid token response", async () => {
        const tokenRequest = mockTokens().mockResolvedValueOnce({ data: {} });
        const client = new G0v0ApiClient(server);
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: userData }));
        client.api.get = request as never;

        await expect(client.getUserById(130)).rejects.toThrow("public token response is invalid");
        expect(request).not.toHaveBeenCalled();
        await expect(client.getUserById(130)).resolves.toMatchObject({ id: 130 });
        expect(tokenRequest).toHaveBeenCalledTimes(2);
    });

    test("maps missing profiles to the existing user-facing error without refreshing", async () => {
        const tokenRequest = mockTokens();
        const client = new G0v0ApiClient(server);
        client.api.get = jest.fn(async () => {
            throw httpError(404);
        }) as never;

        await expect(client.getUser("missing")).rejects.toBeInstanceOf(UserNotFoundError);
        expect(tokenRequest).toHaveBeenCalledTimes(1);
    });
});

describe("g0v0 score selection", () => {
    test.each([
        ["NM", 2],
        ["HD", 4],
        ["HDHR", 5],
    ] as const)("selects exact %s mods from the array response", async (mods, expectedId) => {
        mockTokens();
        const client = new G0v0ApiClient(server);
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: [
                scoreData(1, ["DT"], 900000),
                scoreData(2, ["CL"], 400000),
                scoreData(3, ["HD"], 200000),
                scoreData(4, ["HD"], 300000),
                scoreData(5, ["HR", "HD"], 500000),
            ],
        }));
        client.api.get = request as never;

        const score = await client.getScoreByUid(255, 1782390, 0, new Mods(mods));
        expect(score.api_score_id).toBe(expectedId);
        expect(score.accuracy()).toBe(0.973816);
        expect(score.player_id).toBe(255);
        expect(request).toHaveBeenCalledWith("/beatmaps/1782390/scores/users/255/all?ruleset=osu", expect.anything());
    });

    test.each([{ scores: [] }, { scores: [scoreData(1, ["DT"])] }])(
        "reports no score when the requested mods are absent",
        async ({ scores }) => {
            mockTokens();
            const client = new G0v0ApiClient(server);
            client.api.get = jest.fn(async () => ({ data: scores })) as never;
            await expect(client.getScoreByUid(255, 1782390, 0, new Mods("HD"))).rejects.toBeInstanceOf(
                NoScoresFoundError
            );
        }
    );

    test("keeps the best-score endpoint when no mod filter is requested", async () => {
        mockTokens();
        const client = new G0v0ApiClient(server);
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: { score: scoreData(6, ["DT"]) },
        }));
        client.api.get = request as never;

        expect((await client.getScoreByUid(255, 1782390, 1)).api_score_id).toBe(6);
        expect(request).toHaveBeenCalledWith("/beatmaps/1782390/scores/users/255?mode=taiko", expect.anything());
    });

    test("preserves the wrapped all-scores response and OAuth flow on Bancho", async () => {
        const tokenRequest = mockTokens();
        const client = new BanchoV2ApiClient(42, "client-secret");
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: { scores: [scoreData(7, ["CL"])] },
        }));
        client.api.get = request as never;
        await client.login();

        expect((await client.getScoreByUid(255, 1782390, 0, new Mods("NM"))).api_score_id).toBe(7);
        expect(tokenRequest).toHaveBeenCalledWith(
            "https://osu.ppy.sh/oauth/token",
            {
                grant_type: "client_credentials",
                client_id: 42,
                client_secret: "client-secret",
                scope: "public",
            },
            { timeout: 15000 }
        );
        expect(client.api.defaults.baseURL).toBe("https://osu.ppy.sh/api/v2");
    });
});
