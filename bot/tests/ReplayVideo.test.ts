import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { OsuReplay } from "../src/commands/modules/simple/OsuReplay";
import { SimpleCommandsModule } from "../src/commands/modules/simple/SimpleCommandsModule";
import { IMessageContext } from "../src/core/IMessageContext";
import { IRenderResponse } from "../src/games/osu/replays/rendering/IRenderResponse";
import * as calculator from "../src/games/osu/performance/OfficialCalculator";
import * as replays from "../src/games/osu/replays/OsrReplay";
import * as renderers from "../src/games/osu/replays/rendering/IssouBestRenderer";
import * as videos from "../src/infrastructure/video/RemoteVideoMetadata";
import { createTestStorage } from "./fakes/ApplicationStorageFake";

const previousRenderReplays = process.env.RENDER_REPLAYS;
type VideoMetadata = Awaited<ReturnType<typeof videos.probeRemoteVideoMetadata>>;

afterEach(() => {
    jest.restoreAllMocks();
    if (previousRenderReplays === undefined) delete process.env.RENDER_REPLAYS;
    else process.env.RENDER_REPLAYS = previousRenderReplays;
});

interface RenderOptions {
    ordrAvailable?: boolean;
    experimentalAvailable?: boolean;
    mode?: number;
    ordrResponse?: IRenderResponse;
}

async function renderVideo(experimental: boolean, metadata: VideoMetadata, options: RenderOptions = {}) {
    process.env.RENDER_REPLAYS = "true";
    const response = {
        success: true,
        video: { url: "https://renderer.example/video.mp4", width: 1280, height: 720 },
    };
    const renderer = {
        supportGameMode: (mode: number) => mode === 0,
        available: jest.fn(async () => options.ordrAvailable ?? true),
        render: jest.fn(async () => options.ordrResponse ?? response),
    };
    const experimentalRenderer = {
        supportGameMode: () => true,
        available: jest.fn(async () => options.experimentalAvailable ?? true),
        render: jest.fn(async () => response),
    };
    jest.spyOn(renderers, "IssouBestRenderer").mockImplementation(() => renderer as never);
    jest.spyOn(calculator, "readReplayHeader").mockResolvedValue({ beatmap_hash: "hash", mode: 0 } as never);
    jest.spyOn(calculator, "decodeReplay").mockResolvedValue({} as never);
    jest.spyOn(replays, "OsrReplay").mockImplementation(
        () => ({ mode: options.mode ?? 0, mods: [], player: "player", frameCount: 1 }) as never
    );
    const probe = jest.spyOn(videos, "probeRemoteVideoMetadata").mockResolvedValue(metadata);
    const storage = createTestStorage();
    const success = jest.spyOn(storage.telemetry, "logRenderSuccess");
    const start = jest.spyOn(storage.telemetry, "logRenderStart");
    const failed = jest.spyOn(storage.telemetry, "logRenderFailed");
    const runtime = {
        storage,
        api: { bancho: { downloadReplay: async () => Buffer.from("replay") } },
        osuBeatmapProvider: {
            getBeatmapByHash: async () => ({
                mode: 0,
                stats: { length: 480, stars: 4 },
                applyMods: async () => {},
            }),
        },
        chatBeatmaps: { setMap: () => {} },
    };
    const command = new OsuReplay({ bot: runtime } as unknown as SimpleCommandsModule);
    command.experimental_renderer = experimentalRenderer;
    const reply = jest.fn<IMessageContext["reply"]>(async () => {});
    const context = {
        platform: "telegram",
        senderId: 42,
        chatId: 101,
        messagePayload: "render_bancho:123",
        isInGroupChat: false,
        isFromOwner: true,
        tr: (key: string) => key,
        userSettings: async () => ({ render_enabled: true, experimental_renderer: experimental }),
        reply,
    } as unknown as IMessageContext;

    await command.function(context, command, undefined);
    return { probe, success, start, failed, reply, context, renderer, experimentalRenderer };
}

describe("rendered replay delivery", () => {
    test.each([false, true])("uses actual video metadata for renderer experimental=%s", async (experimental) => {
        const metadata = { durationSeconds: 12.25, sizeBytes: 123456, width: 640, height: 360 };
        const { probe, success, reply, context } = await renderVideo(experimental, metadata);

        expect(probe).toHaveBeenCalledWith("https://renderer.example/video.mp4");
        expect(success).toHaveBeenCalledWith(context, 0, experimental, metadata);
        expect(reply).toHaveBeenLastCalledWith("", {
            video: { url: "https://renderer.example/video.mp4", width: 640, height: 360, duration: 13 },
        });
    });

    test("still sends video without a fake duration when metadata is unavailable", async () => {
        const { success, reply, context } = await renderVideo(false, {});

        expect(success).toHaveBeenCalledWith(context, 0, false, {});
        expect(reply).toHaveBeenLastCalledWith("", {
            video: {
                url: "https://renderer.example/video.mp4",
                width: 1280,
                height: 720,
                duration: undefined,
            },
        });
    });

    test.each([false, true])("switches from unavailable preferred renderer experimental=%s", async (preferred) => {
        const metadata = { durationSeconds: 12.25, sizeBytes: 123456 };
        const { renderer, experimentalRenderer, success, reply, context } = await renderVideo(preferred, metadata, {
            ordrAvailable: preferred,
            experimentalAvailable: !preferred,
        });

        expect(preferred ? experimentalRenderer.render : renderer.render).not.toHaveBeenCalled();
        expect(preferred ? renderer.render : experimentalRenderer.render).toHaveBeenCalledTimes(1);
        expect(success).toHaveBeenCalledWith(context, 0, !preferred, metadata);
        expect(reply.mock.calls[0][0]).toContain("renderer-fallback");
        expect(reply.mock.calls[0][0].includes("experimental-renderer-warning")).toBe(!preferred);
    });

    test("does not submit when both renderers are unavailable", async () => {
        const { renderer, experimentalRenderer, probe, start, reply } = await renderVideo(
            false,
            {},
            {
                ordrAvailable: false,
                experimentalAvailable: false,
            }
        );

        expect(renderer.render).not.toHaveBeenCalled();
        expect(experimentalRenderer.render).not.toHaveBeenCalled();
        expect(probe).not.toHaveBeenCalled();
        expect(start).not.toHaveBeenCalled();
        expect(reply.mock.calls[0][0]).toBe("renderer-unavailable");
    });

    test("does not fall back to o!rdr for an unsupported game mode", async () => {
        const { renderer, experimentalRenderer, reply } = await renderVideo(
            false,
            {},
            {
                mode: 3,
                experimentalAvailable: false,
            }
        );

        expect(renderer.available).not.toHaveBeenCalled();
        expect(renderer.render).not.toHaveBeenCalled();
        expect(experimentalRenderer.render).not.toHaveBeenCalled();
        expect(reply.mock.calls[0][0]).toBe("experimental-gamemode-unavailable");
    });

    test("falls back once when o!rdr explicitly refuses new render jobs", async () => {
        const metadata = { durationSeconds: 12.25, sizeBytes: 123456 };
        const { renderer, experimentalRenderer, start, failed, success, context } = await renderVideo(false, metadata, {
            ordrResponse: { success: false, unavailable: true, error: "Service is not accepting jobs" },
        });

        expect(renderer.render).toHaveBeenCalledTimes(1);
        expect(experimentalRenderer.render).toHaveBeenCalledTimes(1);
        expect(start.mock.calls.map((call) => call[2])).toEqual([false, true]);
        expect(failed).toHaveBeenCalledWith(context, 0, "Service is not accepting jobs", false);
        expect(success).toHaveBeenCalledWith(context, 0, true, metadata);
    });

    test("does not resubmit a rejected replay to another renderer", async () => {
        const { renderer, experimentalRenderer, success } = await renderVideo(
            false,
            {},
            {
                ordrResponse: { success: false, error: "Invalid replay" },
            }
        );

        expect(renderer.render).toHaveBeenCalledTimes(1);
        expect(experimentalRenderer.available).not.toHaveBeenCalled();
        expect(experimentalRenderer.render).not.toHaveBeenCalled();
        expect(success).not.toHaveBeenCalled();
    });

    test("does not return to an experimental renderer already found unavailable", async () => {
        const { renderer, experimentalRenderer } = await renderVideo(
            true,
            {},
            {
                experimentalAvailable: false,
                ordrResponse: { success: false, unavailable: true, error: "Service is not accepting jobs" },
            }
        );

        expect(renderer.render).toHaveBeenCalledTimes(1);
        expect(experimentalRenderer.available).toHaveBeenCalledTimes(1);
        expect(experimentalRenderer.render).not.toHaveBeenCalled();
    });
});
