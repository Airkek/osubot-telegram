import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import childProcess, { ChildProcess } from "node:child_process";
import axios from "axios";
import { probeRemoteVideoMetadata } from "../src/infrastructure/video/RemoteVideoMetadata";

const VIDEO_URL = "https://renderer.example/renders/123?token=private";
const warn = jest.fn();

function mockProbe(stdout: string, error: Error | null = null) {
    return jest.spyOn(childProcess, "execFile").mockImplementation((...args: unknown[]) => {
        const callback = args[3] as (error: Error | null, stdout: string, stderr: string) => void;
        callback(error, stdout, "private renderer diagnostic");
        return {} as ChildProcess;
    });
}

beforeEach(() => {
    global.logger = { warn } as unknown as typeof global.logger;
    jest.spyOn(axios, "head").mockResolvedValue({ status: 405, headers: {} });
});

afterEach(() => {
    jest.restoreAllMocks();
    warn.mockClear();
});

describe("remote rendered video metadata", () => {
    test("reads actual duration, byte size and dimensions without another network request", async () => {
        const run = mockProbe(
            JSON.stringify({ format: { duration: "61.25", size: "123456" }, streams: [{ width: 1280, height: 720 }] })
        );

        await expect(probeRemoteVideoMetadata(VIDEO_URL)).resolves.toEqual({
            durationSeconds: 61.25,
            sizeBytes: 123456,
            width: 1280,
            height: 720,
        });
        expect(axios.head).not.toHaveBeenCalled();
        expect(run).toHaveBeenCalledWith(
            "ffprobe",
            expect.arrayContaining(["-protocol_whitelist", "http,https,tcp,tls", "-rw_timeout", "10000000", VIDEO_URL]),
            expect.objectContaining({ timeout: 15_000, killSignal: "SIGKILL", maxBuffer: 64 * 1024 }),
            expect.any(Function)
        );
        expect(warn).not.toHaveBeenCalled();
    });

    test("uses video stream duration when container duration is unavailable", async () => {
        mockProbe(JSON.stringify({ format: { duration: "N/A", size: "12" }, streams: [{ duration: "17.75" }] }));
        expect(await probeRemoteVideoMetadata(VIDEO_URL)).toEqual({
            durationSeconds: 17.75,
            sizeBytes: 12,
            width: undefined,
            height: undefined,
        });
        expect(axios.head).not.toHaveBeenCalled();
    });

    test("uses a bounded HEAD request only when probe size is missing", async () => {
        mockProbe(JSON.stringify({ format: { duration: "7.5" } }));
        jest.mocked(axios.head).mockResolvedValue({ status: 200, headers: { "content-length": "7654321" } });
        expect(await probeRemoteVideoMetadata(VIDEO_URL)).toMatchObject({ durationSeconds: 7.5, sizeBytes: 7654321 });
        expect(axios.head).toHaveBeenCalledWith(
            VIDEO_URL,
            expect.objectContaining({
                timeout: 5000,
                maxRedirects: 3,
                decompress: false,
                headers: { "Accept-Encoding": "identity" },
                signal: expect.any(AbortSignal),
            })
        );
        expect(warn).not.toHaveBeenCalled();
    });

    test("ignores a compressed HEAD response content length", async () => {
        mockProbe(JSON.stringify({ format: { duration: "7.5" } }));
        jest.mocked(axios.head).mockResolvedValue({
            status: 200,
            headers: { "content-encoding": "gzip", "content-length": "100" },
        });
        const metadata = await probeRemoteVideoMetadata(VIDEO_URL);
        expect(metadata.durationSeconds).toBe(7.5);
        expect(metadata.sizeBytes).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("ignores content length from an unsuccessful HEAD response", async () => {
        mockProbe(JSON.stringify({ format: { duration: "7.5" } }));
        jest.mocked(axios.head).mockResolvedValue({ status: 404, headers: { "content-length": "100" } });
        expect((await probeRemoteVideoMetadata(VIDEO_URL)).sizeBytes).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("preserves size after a probe timeout and does not log the URL or child stderr", async () => {
        mockProbe("", Object.assign(new Error(`Timed out running ${VIDEO_URL}`), { code: "ETIMEDOUT" }));
        jest.mocked(axios.head).mockResolvedValue({ status: 200, headers: { "content-length": "123" } });
        const metadata = await probeRemoteVideoMetadata(VIDEO_URL);
        expect(metadata.durationSeconds).toBeUndefined();
        expect(metadata.sizeBytes).toBe(123);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private|renderer\.example/);
    });

    test("returns unknown metadata when JSON is malformed and HEAD fails", async () => {
        mockProbe("not json");
        jest.mocked(axios.head).mockRejectedValue(new Error("HEAD unavailable"));
        expect(await probeRemoteVideoMetadata(VIDEO_URL)).toEqual({});
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("rejects nonfinite values, unsafe byte sizes and invalid dimensions", async () => {
        mockProbe(
            JSON.stringify({
                format: { duration: "Infinity", size: "9007199254740992" },
                streams: [{ duration: "N/A", width: 0, height: -720 }],
            })
        );
        const metadata = await probeRemoteVideoMetadata(VIDEO_URL);
        expect(Object.values(metadata).every((value) => value === undefined)).toBe(true);
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test.each(["file:///tmp/video.mp4", "https://user:secret@renderer.example/video.mp4", "not a URL"])(
        "does not probe unsupported or credential-bearing URL %s",
        async (url) => {
            const run = mockProbe("{}");
            expect(await probeRemoteVideoMetadata(url)).toEqual({});
            expect(run).not.toHaveBeenCalled();
            expect(axios.head).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledTimes(1);
        }
    );
});
