import { Bot as TG } from "grammy/out/bot";
import { InputFile } from "grammy";
import { downloadRemoteImage } from "../RemoteImage";
import { CoversProvider } from "../core/CoversProvider";
import { MediaReferenceCache } from "../core/ApplicationStorage";

export class TelegramCoversProvider implements CoversProvider {
    private readonly cache: MediaReferenceCache;
    private readonly tg: TG;
    private readonly owner: number;

    constructor(cache: MediaReferenceCache, tg: TG, owner: number) {
        this.cache = cache;
        this.tg = tg;
        this.owner = owner;
    }

    async addCover(id: number): Promise<string> {
        try {
            const image = await downloadRemoteImage(`https://assets.ppy.sh/beatmaps/${id}/covers/cover@2x.jpg`);
            const file = new InputFile(image, "cover.jpg");
            const send = await this.tg.api.sendPhoto(this.owner, file);
            const photo = send.photo[0].file_id;

            await this.cache.storeCover(id, photo.toString());

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getCover(id: number): Promise<string> {
        const attachment = await this.cache.getCover(id);
        if (!attachment) {
            return this.addCover(id);
        }
        return attachment;
    }

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            const image = await downloadRemoteImage(photoUrl);
            const file = new InputFile(image, "cover");
            const send = await this.tg.api.sendPhoto(this.owner, file);
            const photo = send.photo[0].file_id;

            await this.cache.storePhoto(photoUrl, photo.toString());

            return photo.toString();
        } catch {
            return "";
        }
    }

    async getPhotoDoc(photoUrl: string): Promise<string> {
        const attachment = await this.cache.getPhoto(photoUrl);
        if (!attachment) {
            return this.addPhotoDoc(photoUrl);
        }
        return attachment;
    }

    async removeEmpty() {
        await this.cache.removeEmpty();
    }
}
