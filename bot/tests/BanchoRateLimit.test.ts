import { describe, expect, jest, test } from "@jest/globals";
import { NoScoresFoundError } from "../src/core/errors/NoScoresFoundError";
import { Mods } from "../src/games/osu/performance/Mods";
import { BanchoV2ApiClient } from "../src/games/osu/server/bancho/BanchoV2ApiClient";

global.logger = {
    warn() {},
} as typeof global.logger;

function rateLimitError(): Error {
    return Object.assign(new Error("Rate limited"), {
        isAxiosError: true,
        response: {
            status: 429,
            headers: { "retry-after": "0" },
        },
    });
}

describe("BanchoV2ApiClient rate limits", () => {
    test("retries a request after HTTP 429", async () => {
        const client = new BanchoV2ApiClient(1, "secret");
        let attempts = 0;
        const request = jest.fn(async () => {
            attempts++;
            if (attempts === 1) {
                throw rateLimitError();
            }
            return { data: undefined };
        });
        client.api.get = request as never;

        await expect(client.getScoreByUid(1, 1, 0, new Mods("HD"))).rejects.toBeInstanceOf(NoScoresFoundError);
        expect(request).toHaveBeenCalledTimes(2);
    });

    test("stops retrying after the configured limit", async () => {
        const client = new BanchoV2ApiClient(1, "secret");
        const error = rateLimitError();
        const request = jest.fn(async () => {
            throw error;
        });
        client.api.get = request as never;

        await expect(client.getScoreByUid(1, 1, 0, new Mods("HD"))).rejects.toBe(error);
        expect(request).toHaveBeenCalledTimes(4);
    });
});
