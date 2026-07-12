import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { IMediaReferenceCache } from "core/storage/IMediaReferenceCache";
import { Platform } from "core/Platform";

interface StoredAttachment {
    attachment: string;
}

export class MediaReferenceModel implements IMediaReferenceCache {
    constructor(
        private readonly db: ISqlExecutor,
        private readonly platform: Platform
    ) {}

    async getPhoto(url: string): Promise<string | null> {
        const row = await this.db.get<StoredAttachment>(
            "SELECT attachment FROM photos WHERE platform = $1 AND url = $2",
            [this.platform, url]
        );
        return row?.attachment ?? null;
    }

    async storePhoto(url: string, attachment: string): Promise<void> {
        await this.db.run(
            `INSERT INTO photos (platform, url, attachment)
             VALUES ($1, $2, $3)
             ON CONFLICT (platform, url) DO UPDATE SET attachment = EXCLUDED.attachment`,
            [this.platform, url, attachment]
        );
    }
}
