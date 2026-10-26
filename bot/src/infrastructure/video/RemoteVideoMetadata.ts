import { execFile } from "node:child_process";
import axios from "axios";

interface IRemoteVideoMetadata {
    durationSeconds?: number;
    sizeBytes?: number;
    width?: number;
    height?: number;
}

interface ProbeResponse {
    format?: { duration?: unknown; size?: unknown };
    streams?: { duration?: unknown; width?: unknown; height?: unknown }[];
}

function positiveNumber(value: unknown): number | undefined {
    if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : undefined;
}

function positiveInteger(value: unknown): number | undefined {
    const number = positiveNumber(value);
    return Number.isSafeInteger(number) ? number : undefined;
}

async function probe(url: string): Promise<IRemoteVideoMetadata> {
    const stdout = await new Promise<string>((resolve, reject) => {
        execFile(
            "ffprobe",
            [
                "-v",
                "error",
                "-protocol_whitelist",
                "http,https,tcp,tls",
                "-rw_timeout",
                "10000000",
                "-select_streams",
                "v:0",
                "-show_entries",
                "format=duration,size:stream=duration,width,height",
                "-of",
                "json",
                url,
            ],
            { encoding: "utf8", timeout: 15_000, killSignal: "SIGKILL", maxBuffer: 64 * 1024 },
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            }
        );
    });
    const response = JSON.parse(stdout) as ProbeResponse | null;
    const video = Array.isArray(response?.streams) ? response.streams[0] : undefined;
    return {
        durationSeconds: positiveNumber(response?.format?.duration) ?? positiveNumber(video?.duration),
        sizeBytes: positiveInteger(response?.format?.size),
        width: positiveInteger(video?.width),
        height: positiveInteger(video?.height),
    };
}

async function readSize(url: string): Promise<number | undefined> {
    const response = await axios.head(url, {
        timeout: 5000,
        signal: AbortSignal.timeout(5000),
        maxRedirects: 3,
        decompress: false,
        headers: { "Accept-Encoding": "identity" },
        validateStatus: () => true,
        beforeRedirect: (options) => {
            if (options.auth) {
                throw new Error("Remote video redirects must not include credentials");
            }
        },
    });
    const encoding = response.headers["content-encoding"];
    if (response.status !== 200 || (encoding && String(encoding).trim().toLowerCase() !== "identity")) {
        return undefined;
    }
    return positiveInteger(response.headers["content-length"]);
}

export async function probeRemoteVideoMetadata(url: string): Promise<IRemoteVideoMetadata> {
    let metadata: IRemoteVideoMetadata = {};
    try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
            throw new Error("Remote videos must use HTTP(S) URLs without credentials");
        }
    } catch {
        global.logger?.warn("Rendered video metadata URL is invalid");
        return metadata;
    }

    try {
        metadata = await probe(url);
    } catch {
        // Metadata failures must not prevent video delivery
    }

    if (metadata.sizeBytes === undefined) {
        try {
            metadata.sizeBytes = await readSize(url);
        } catch {
            // Some video servers do not support HEAD requests
        }
    }

    if (metadata.durationSeconds === undefined || metadata.sizeBytes === undefined) {
        global.logger?.warn("Rendered video metadata is incomplete");
    }
    return metadata;
}
