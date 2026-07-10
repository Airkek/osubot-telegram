import https from "node:https";
import http from "node:http";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 16_384;
const MAX_IMAGE_PIXELS = MAX_IMAGE_DIMENSION ** 2;
const MAX_REDIRECTS = 3;

const ALLOWED_IMAGE_FORMATS = new Set(["avif", "gif", "heif", "jpeg", "png", "webp"]);

async function requestImage(url: URL, redirectsLeft: number): Promise<Buffer> {
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Remote images must use HTTP(S) URLs without credentials");
    }

    const client = url.protocol === "https:" ? https : http;

    return new Promise<Buffer>((resolve, reject) => {
        let settled = false;
        const finishWithError = (error: Error) => {
            if (!settled) {
                settled = true;
                reject(error);
            }
        };

        const request = client.get(
            url,
            {
                headers: {
                    Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
                    "Accept-Encoding": "identity",
                },
            },
            (response) => {
                const status = response.statusCode ?? 0;
                if ([301, 302, 303, 307, 308].includes(status)) {
                    response.resume();
                    if (redirectsLeft === 0 || !response.headers.location) {
                        finishWithError(new Error("Remote image redirect limit exceeded"));
                        return;
                    }
                    const redirectUrl = new URL(response.headers.location, url);
                    requestImage(redirectUrl, redirectsLeft - 1).then(resolve, finishWithError);
                    return;
                }

                if (status < 200 || status >= 300) {
                    response.resume();
                    finishWithError(new Error(`Remote image returned HTTP ${status}`));
                    return;
                }

                const contentType = response.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
                if (!contentType?.startsWith("image/")) {
                    response.resume();
                    finishWithError(new Error("Remote resource is not an image"));
                    return;
                }

                const declaredLength = Number(response.headers["content-length"]);
                if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
                    response.resume();
                    finishWithError(new Error("Remote image is too large"));
                    return;
                }

                const chunks: Buffer[] = [];
                let size = 0;
                response.on("data", (chunk: Buffer) => {
                    size += chunk.length;
                    if (size > MAX_IMAGE_BYTES) {
                        response.destroy(new Error("Remote image is too large"));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on("end", () => {
                    if (!settled) {
                        settled = true;
                        resolve(Buffer.concat(chunks, size));
                    }
                });
                response.on("error", finishWithError);
            }
        );

        request.setTimeout(15_000, () => request.destroy(new Error("Remote image request timed out")));
        request.on("error", finishWithError);
    });
}

export async function downloadRemoteImage(url: string): Promise<Buffer> {
    const image = await requestImage(new URL(url), MAX_REDIRECTS);
    const metadata = await sharp(image, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
    const frameHeight = metadata.pageHeight || metadata.height || 0;
    const totalPixels = (metadata.width || 0) * frameHeight * (metadata.pages || 1);

    if (
        !metadata.format ||
        !ALLOWED_IMAGE_FORMATS.has(metadata.format) ||
        !metadata.width ||
        !metadata.height ||
        metadata.width > MAX_IMAGE_DIMENSION ||
        metadata.height > MAX_IMAGE_DIMENSION ||
        totalPixels > MAX_IMAGE_PIXELS
    ) {
        throw new Error("Remote image has an unsupported format or dimensions");
    }

    return image;
}
