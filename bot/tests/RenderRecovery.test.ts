import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import axios, { AxiosError } from "axios";
import FormData from "form-data";
import { IssouBestRenderer } from "../src/games/osu/replays/rendering/IssouBestRenderer";
import { IRenderSettings } from "../src/games/osu/replays/rendering/IRenderSettings";

const renderId = 12345;
const videoUrl = "https://video.example/render.mp4";
const linkUrl = `https://apis.issou.best/dynlink/ordr/gen?id=${renderId}`;
const previousUsername = process.env.ORDR_USERNAME;
const previousKey = process.env.ORDR_API_KEY;
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

function renderer() {
    const waitForRenderCompletion = jest.fn<(renderId: number) => Promise<void>>().mockResolvedValue();
    const instance: IssouBestRenderer = Object.assign(Object.create(IssouBestRenderer.prototype), {
        wsClient: { waitForRenderCompletion },
    });
    return { instance, waitForRenderCompletion };
}

function httpError(status: number): AxiosError {
    return new AxiosError(`HTTP ${status}`, "ERR_BAD_RESPONSE", undefined, undefined, { status } as never);
}

beforeEach(() => {
    jest.useFakeTimers();
    global.logger = { info: jest.fn(), warn: jest.fn() } as unknown as typeof global.logger;
    process.env.ORDR_USERNAME = "test-bot";
    process.env.ORDR_API_KEY = "test-key";
    jest.spyOn(axios, "post").mockResolvedValue({ data: { renderID: renderId } });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (previousUsername === undefined) delete process.env.ORDR_USERNAME;
    else process.env.ORDR_USERNAME = previousUsername;
    if (previousKey === undefined) delete process.env.ORDR_API_KEY;
    else process.env.ORDR_API_KEY = previousKey;
});

describe("completed o!rdr render recovery", () => {
    test("retrieves only the video URL without requesting render metadata", async () => {
        const get = jest.spyOn(axios, "get").mockResolvedValue({ data: { url: videoUrl } });
        const { instance, waitForRenderCompletion } = renderer();

        await expect(instance.render(Buffer.from("replay"), settings)).resolves.toEqual({
            success: true,
            video: { url: videoUrl },
        });
        expect(waitForRenderCompletion).toHaveBeenCalledWith(renderId);
        expect(get).toHaveBeenCalledTimes(1);
        expect(get).toHaveBeenCalledWith(linkUrl, {
            timeout: 10000,
            signal: expect.any(AbortSignal),
        });
        const upload = jest.mocked(axios.post).mock.calls[0][1] as FormData;
        expect(upload.getBuffer().toString()).toContain('name="resolution"\r\n\r\n1280x720');
    });

    test("keeps recovering an AggregateError after many failures without resubmitting the replay", async () => {
        const error = AxiosError.from(
            new AggregateError([Object.assign(new Error("Connection timed out"), { code: "ETIMEDOUT" })]),
            "ETIMEDOUT"
        );
        const get = jest.spyOn(axios, "get").mockRejectedValue(error);
        const { instance, waitForRenderCompletion } = renderer();
        const result = instance.render(Buffer.from("replay"), settings);
        const delays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

        await jest.advanceTimersByTimeAsync(0);
        for (const [index, delay] of delays.entries()) {
            expect(get).toHaveBeenCalledTimes(index + 1);
            await jest.advanceTimersByTimeAsync(delay - 1);
            expect(get).toHaveBeenCalledTimes(index + 1);
            await jest.advanceTimersByTimeAsync(1);
        }
        get.mockResolvedValue({ data: { url: videoUrl } });
        await jest.advanceTimersByTimeAsync(30000);

        await expect(result).resolves.toMatchObject({ success: true, video: { url: videoUrl } });
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(waitForRenderCompletion).toHaveBeenCalledTimes(1);
        expect(get.mock.calls.every(([url]) => url === linkUrl)).toBe(true);
    });

    test.each([404, 408, 429, 500, 503])("recovers a video URL after HTTP %s", async (status) => {
        const get = jest
            .spyOn(axios, "get")
            .mockRejectedValueOnce(httpError(status))
            .mockResolvedValue({ data: { url: videoUrl } });
        const result = renderer().instance.render(Buffer.from("replay"), settings);
        await jest.advanceTimersByTimeAsync(1000);

        await expect(result).resolves.toMatchObject({ success: true, video: { url: videoUrl } });
        expect(get).toHaveBeenCalledTimes(2);
        expect(axios.post).toHaveBeenCalledTimes(1);
    });

    test.each([null, {}, { url: "" }, { url: " " }, { url: 123 }])(
        "waits for a usable video URL after an incomplete response %j",
        async (data) => {
            jest.spyOn(axios, "get")
                .mockResolvedValueOnce({ data })
                .mockResolvedValue({ data: { url: videoUrl } });
            const result = renderer().instance.render(Buffer.from("replay"), settings);
            await jest.advanceTimersByTimeAsync(1000);

            await expect(result).resolves.toMatchObject({ success: true, video: { url: videoUrl } });
        }
    );

    test("preserves a permanent API error for the command error handler", async () => {
        const error = httpError(403);
        const get = jest.spyOn(axios, "get").mockRejectedValue(error);

        await expect(renderer().instance.render(Buffer.from("replay"), settings)).rejects.toBe(error);
        expect(get).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
    });

    test("does not look up a video when the renderer reports failure", async () => {
        const get = jest.spyOn(axios, "get");
        const { instance, waitForRenderCompletion } = renderer();
        waitForRenderCompletion.mockRejectedValue("Render failed");

        await expect(instance.render(Buffer.from("replay"), settings)).resolves.toEqual({
            success: false,
            error: "Render failed",
        });
        expect(get).not.toHaveBeenCalled();
    });
});
