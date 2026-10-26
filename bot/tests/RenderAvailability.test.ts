import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import axios from "axios";
import { IRenderSettings } from "../src/games/osu/replays/rendering/IRenderSettings";
import { IssouBestRenderer } from "../src/games/osu/replays/rendering/IssouBestRenderer";

const previousUsername = process.env.ORDR_USERNAME;
const previousKey = process.env.ORDR_API_KEY;

beforeEach(() => {
    global.logger = { info() {} } as typeof global.logger;
    process.env.ORDR_USERNAME = "test-bot";
    process.env.ORDR_API_KEY = "test-key";
});

afterEach(() => {
    jest.restoreAllMocks();
    if (previousUsername === undefined) delete process.env.ORDR_USERNAME;
    else process.env.ORDR_USERNAME = previousUsername;
    if (previousKey === undefined) delete process.env.ORDR_API_KEY;
    else process.env.ORDR_API_KEY = previousKey;
});

function renderer(): IssouBestRenderer {
    return Object.create(IssouBestRenderer.prototype);
}

describe("o!rdr availability", () => {
    test("checks the API without submitting a render", async () => {
        const get = jest.spyOn(axios, "get").mockResolvedValue({ data: { renders: [] } });

        expect(await renderer().available()).toBe(true);
        expect(get).toHaveBeenCalledWith("https://apis.issou.best/ordr/renders", {
            params: { pageSize: 1 },
            timeout: 5000,
        });
    });

    test("reports an unreachable API as unavailable", async () => {
        jest.spyOn(axios, "get").mockRejectedValue(new Error("Connection refused"));
        expect(await renderer().available()).toBe(false);
    });

    test("does not treat an unexpected HTTP response as API readiness", async () => {
        jest.spyOn(axios, "get").mockResolvedValue({ data: "Service unavailable" });
        expect(await renderer().available()).toBe(false);
    });

    test.each([
        { code: 40, unavailable: true },
        { code: 41, unavailable: true },
        { code: 38, unavailable: false },
        { code: undefined, unavailable: false },
    ])("marks only an explicit refusal to accept jobs as unavailable: $code", async ({ code, unavailable }) => {
        jest.spyOn(axios, "post").mockRejectedValue({
            message: "Request failed",
            response: { data: { errorCode: code, message: "Render rejected" } },
        });
        const settings: IRenderSettings = {
            skin: "default",
            video: true,
            storyboard: false,
            dim: 75,
            pp_counter: true,
            ur_counter: true,
            hit_counter: false,
            strain_graph: false,
            isSkinCustom: false,
            masterVolume: 50,
            musicVolume: 50,
            effectsVolume: 50,
            scrollSpeed: 26,
        };

        expect(await renderer().render(Buffer.from("replay"), settings)).toMatchObject({
            success: false,
            unavailable,
            error: "Render rejected",
        });
    });
});
