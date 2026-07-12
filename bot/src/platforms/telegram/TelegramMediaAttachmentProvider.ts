import { Bot as TG } from "grammy/out/bot";
import { InputFile } from "grammy";
import { downloadRemoteImage } from "infrastructure/http/RemoteImage";
import { IMediaAttachmentProvider } from "core/IMediaAttachmentProvider";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";

export class TelegramMediaAttachmentProvider implements IMediaAttachmentProvider {
    constructor(
        private readonly cache: IMediaReferenceCache,
        private readonly tg: TG,
        private readonly owner: number
    ) {}

    async addPhotoDoc(photoUrl: string): Promise<string> {
        try {
            const image = await downloadRemoteImage(photoUrl);
            const file = new InputFile(image);
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
        return attachment ?? (await this.addPhotoDoc(photoUrl));
    }
}
