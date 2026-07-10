import { APIError, PhotoAttachment, VideoAttachment, VK } from "vk-io";
import sharp from "sharp";

export const VK_UPLOAD_TIMEOUT_MS = 60_000;
export const VK_VIDEO_UPLOAD_TIMEOUT_MS = 5 * 60_000;
const MIN_IMAGE_UPLOAD_TIMEOUT_MS = 10_000;
const IMAGE_UPLOAD_TIMEOUT_PER_MIB_MS = 1_000;

interface ImageMediaType {
    extension: string;
    contentType: string;
}

export interface PhotoUploadOptions {
    retry?: boolean;
    maxTimeoutMs?: number;
}

const IMAGE_MEDIA_TYPES: Record<string, ImageMediaType> = {
    avif: { extension: "avif", contentType: "image/avif" },
    gif: { extension: "gif", contentType: "image/gif" },
    heif: { extension: "heif", contentType: "image/heif" },
    jpeg: { extension: "jpg", contentType: "image/jpeg" },
    png: { extension: "png", contentType: "image/png" },
    webp: { extension: "webp", contentType: "image/webp" },
};

function isRetriableUploadError(error: unknown): boolean {
    if (error instanceof APIError) {
        return error.code === 100 && /photo is undefined/i.test(error.message);
    }
    if (!(error instanceof Error)) {
        return false;
    }
    return (
        error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        /gateway time-?out|bad gateway|service unavailable|socket hang up|ECONNRESET|ETIMEDOUT/i.test(error.message)
    );
}

export async function uploadMessagePhoto(
    vk: VK,
    peerId: number,
    image: Buffer,
    options: PhotoUploadOptions = {}
): Promise<PhotoAttachment> {
    const metadata = await sharp(image).metadata();
    const mediaType = metadata.format ? IMAGE_MEDIA_TYPES[metadata.format] : undefined;
    if (!mediaType) {
        throw new Error(`VK photo upload does not support image format '${metadata.format || "unknown"}'`);
    }
    const timeout = Math.min(
        options.maxTimeoutMs ?? VK_UPLOAD_TIMEOUT_MS,
        MIN_IMAGE_UPLOAD_TIMEOUT_MS + Math.ceil(image.length / (1024 * 1024)) * IMAGE_UPLOAD_TIMEOUT_PER_MIB_MS
    );
    const source = {
        values: {
            value: image,
            filename: `image.${mediaType.extension}`,
            contentType: mediaType.contentType,
            contentLength: image.length,
        },
        timeout,
    };

    const maxAttempts = options.retry === false ? 1 : 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await vk.upload.messagePhoto({
                peer_id: peerId,
                source,
            });
        } catch (error) {
            if (attempt === maxAttempts || !isRetriableUploadError(error)) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            global.logger.warn(
                `VK photo upload attempt ${attempt}/${maxAttempts} failed transiently; retrying with a new upload URL: ${message}`
            );
        }
    }

    throw new Error("VK photo upload attempts were exhausted");
}

export async function uploadMessageVideo(
    vk: VK,
    groupId: number,
    videoUrl: string,
    title?: string
): Promise<VideoAttachment> {
    return await vk.upload.video({
        group_id: groupId,
        name: title?.trim() || "video",
        is_private: 1,
        wallpost: 0,
        no_comments: 1,
        source: {
            values: {
                value: videoUrl,
                filename: "video.mp4",
                contentType: "video/mp4",
            },
            timeout: VK_VIDEO_UPLOAD_TIMEOUT_MS,
        },
    });
}
