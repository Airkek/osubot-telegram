import { VK } from "vk-io";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";
import { IMediaAttachmentProvider } from "core/IMediaAttachmentProvider";
import { downloadRemoteImage } from "infrastructure/http/RemoteImage";
import { uploadMessagePhoto } from "platforms/vk/Upload";

export class VKMediaAttachmentProvider implements IMediaAttachmentProvider {
    private readonly pendingUploads = new Map<string, Promise<void>>();

    constructor(
        private readonly cache: IMediaReferenceCache,
        private readonly vk: VK,
        private readonly owner: number
    ) {}

    async getPhotoDoc(photoUrl: string): Promise<string> {
        const cached = await this.cache.getPhoto(photoUrl);
        return cached ?? (await this.addPhotoDoc(photoUrl));
    }

    async addPhotoDoc(url: string): Promise<string> {
        if (this.pendingUploads.has(url)) {
            return "";
        }

        let image: Buffer;
        try {
            image = await downloadRemoteImage(url);
            const photo = await uploadMessagePhoto(this.vk, this.owner, image, {
                retry: false,
                maxTimeoutMs: 10_000,
            });
            const attachment = photo.toString();
            await this.cache.storePhoto(url, attachment);
            return attachment;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            global.logger.warn(`Failed to cache VK image '${url}'; retrying in background: ${message}`);
            if (image) {
                this.retryInBackground(url, image);
            }
            return "";
        }
    }

    private retryInBackground(url: string, image: Buffer): void {
        const upload = (async () => {
            const photo = await uploadMessagePhoto(this.vk, this.owner, image, {
                retry: false,
            });
            await this.cache.storePhoto(url, photo.toString());
        })();
        this.pendingUploads.set(url, upload);
        void upload
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                global.logger.error(`Background VK image cache upload failed for '${url}': ${message}`);
            })
            .finally(() => this.pendingUploads.delete(url));
    }
}
