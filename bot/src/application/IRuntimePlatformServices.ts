import { ExternalId } from "core/ExternalId";
import { IMediaAttachmentProvider } from "core/IMediaAttachmentProvider";
import { Platform } from "core/Platform";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";

export interface IRuntimePlatformServices {
    readonly platform: Platform;
    createMediaAttachmentProvider(mediaReferences: IMediaReferenceCache): IMediaAttachmentProvider;
    sendMessage(recipientId: ExternalId, text: string): Promise<void>;
}
