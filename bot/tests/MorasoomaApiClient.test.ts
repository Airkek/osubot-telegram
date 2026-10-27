import axios from "axios";
import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { NoScoresFoundError } from "../src/core/errors/NoScoresFoundError";
import { UserNotFoundError } from "../src/core/errors/UserNotFoundError";
import { Mods } from "../src/games/osu/performance/Mods";
import { GameApiRegistry } from "../src/games/GameApiRegistry";
import { MorasoomaApiClient } from "../src/games/osu/server/morasooma/MorasoomaApiClient";
import { BanchoV2ApiClient } from "../src/games/osu/server/bancho/BanchoV2ApiClient";
import { IOsuV2Score } from "../src/games/osu/server/v2/IOsuV2Score";
import { formatUser } from "../src/presentation/templates/legacy-text/User";

const server = "https://morasooma.net";
const clientId = 78;
const clientSecret = "morasooma-client-secret";

function createClient() {
    return new MorasoomaApiClient(clientId, clientSecret);
}

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
    return jest.spyOn(axios, "post").mockResolvedValue({ data: { access_token: "oauth-token", expires_in: 3600 } });
}

afterEach(() => jest.restoreAllMocks());

describe("Morasooma OAuth authentication", () => {
    test("shares a lazy OAuth token between concurrent profile requests", async () => {
        const tokenRequest = mockTokens();
        const client = createClient();
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: userData }));
        client.api.get = request as never;

        expect(tokenRequest).not.toHaveBeenCalled();
        const [byName, byId] = await Promise.all([client.getUser("player name", 0), client.getUserById(130, 0)]);

        expect(client.api.defaults.baseURL).toBe(`${server}/api/v2`);
        expect(tokenRequest).toHaveBeenCalledTimes(1);
        expect(tokenRequest).toHaveBeenCalledWith(
            `${server}/oauth/token`,
            {
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
                scope: "public",
            },
            { timeout: 15000 }
        );
        expect(request.mock.calls).toHaveLength(2);
        expect(byName.nickname).toBe("player name");
        expect(byId.profileAvatarUrl).toBe(`${server}/api/private/default-avatar.png`);
        expect(byId.profileUrl).toBe(`${server}/users/130`);
        expect(formatUser({ tr: (key) => key }, byId, server)).toContain(`${server}/users/130`);
    });

    test("keeps Morasooma credentials and tokens separate from Bancho", async () => {
        const tokenRequest = mockTokens()
            .mockResolvedValueOnce({ data: { access_token: "morasooma-token", expires_in: 3600 } })
            .mockResolvedValueOnce({ data: { access_token: "bancho-token" } });
        const registry = new GameApiRegistry({
            banchoClientId: 42,
            banchoClientSecret: "bancho-client-secret",
            morasoomaClientId: clientId,
            morasoomaClientSecret: clientSecret,
        });
        registry.morasooma.api.get = jest.fn(async () => ({ data: userData })) as never;

        await registry.morasooma.getUserById(130);
        await registry.bancho.login();

        expect(tokenRequest).toHaveBeenNthCalledWith(
            1,
            `${server}/oauth/token`,
            {
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
                scope: "public",
            },
            { timeout: 15000 }
        );
        expect(tokenRequest).toHaveBeenNthCalledWith(
            2,
            "https://osu.ppy.sh/oauth/token",
            {
                grant_type: "client_credentials",
                client_id: 42,
                client_secret: "bancho-client-secret",
                scope: "public",
            },
            { timeout: 15000 }
        );
        expect(registry.morasooma.token).toBe("morasooma-token");
        expect(registry.bancho.token).toBe("bancho-token");
    });

    test("reports missing Morasooma credentials before making requests", async () => {
        const tokenRequest = mockTokens();
        const client = new MorasoomaApiClient();
        const request = jest.fn(async () => ({ data: userData }));
        client.api.get = request as never;

        await expect(client.getUserById(130)).rejects.toThrow("Morasooma OAuth client credentials are not configured");
        expect(tokenRequest).not.toHaveBeenCalled();
        expect(request).not.toHaveBeenCalled();
    });

    test("renews the token before expiry", async () => {
        const tokenRequest = mockTokens();
        const now = jest.spyOn(Date, "now").mockReturnValue(100000);
        const client = createClient();
        client.api.get = jest.fn(async () => ({ data: userData })) as never;

        await client.getUserById(130);
        now.mockReturnValue(100000 + 3600 * 1000 - 30000);
        await client.getUserById(130);

        expect(tokenRequest).toHaveBeenCalledTimes(2);
    });

    test("refreshes a rejected token and retries replay download on the same server", async () => {
        const tokenRequest = mockTokens();
        const client = createClient();
        const replay = Buffer.from("replay data");
        const request = jest
            .fn<(...args: unknown[]) => Promise<{ data: Buffer }>>()
            .mockRejectedValueOnce(httpError(401))
            .mockResolvedValueOnce({ data: replay });
        client.api.get = request as never;

        expect(await client.downloadReplay(213468)).toEqual(replay);
        expect(tokenRequest).toHaveBeenCalledTimes(2);
        expect(request).toHaveBeenLastCalledWith("/scores/213468/download", {
            headers: { Authorization: "Bearer oauth-token", "x-api-version": "20241130" },
            responseType: "arraybuffer",
        });
    });

    test("does not refresh forever when a server keeps returning HTTP 401", async () => {
        const tokenRequest = mockTokens();
        const client = createClient();
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
        const client = createClient();
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: userData }));
        client.api.get = request as never;

        await expect(client.getUserById(130)).rejects.toThrow("OAuth token response is invalid");
        expect(request).not.toHaveBeenCalled();
        await expect(client.getUserById(130)).resolves.toMatchObject({ id: 130 });
        expect(tokenRequest).toHaveBeenCalledTimes(2);
    });

    test("maps missing profiles to the existing user-facing error without refreshing", async () => {
        const tokenRequest = mockTokens();
        const client = createClient();
        client.api.get = jest.fn(async () => {
            throw httpError(404);
        }) as never;

        await expect(client.getUser("missing")).rejects.toBeInstanceOf(UserNotFoundError);
        expect(tokenRequest).toHaveBeenCalledTimes(1);
    });
});

describe("Morasooma score selection", () => {
    test.each([
        ["NM", 2],
        ["HD", 4],
        ["HDHR", 5],
    ] as const)("selects exact %s mods from the wrapped scores response", async (mods, expectedId) => {
        mockTokens();
        const client = createClient();
        const request = jest.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
            data: {
                scores: [
                    scoreData(1, ["DT"], 900000),
                    scoreData(2, ["CL"], 400000),
                    scoreData(3, ["HD"], 200000),
                    scoreData(4, ["HD"], 300000),
                    scoreData(5, ["HR", "HD"], 500000),
                ],
            },
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
            const client = createClient();
            client.api.get = jest.fn(async () => ({ data: { scores } })) as never;
            await expect(client.getScoreByUid(255, 1782390, 0, new Mods("HD"))).rejects.toBeInstanceOf(
                NoScoresFoundError
            );
        }
    );

    test("keeps the best-score endpoint when no mod filter is requested", async () => {
        mockTokens();
        const client = createClient();
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
