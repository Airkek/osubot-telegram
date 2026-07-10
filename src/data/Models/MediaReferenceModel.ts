import { MediaReferenceCache } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";
import { Platform } from "../../core/Identity";

interface StoredAttachment {
    attachment: string;
}

export class MediaReferenceModel implements MediaReferenceCache {
    constructor(
        private readonly db: SqlExecutor,
        private readonly platform: Platform
    ) {}

    async getCover(beatmapSetId: number): Promise<string | null> {
        const row = await this.db.get<StoredAttachment>(
            "SELECT attachment FROM covers WHERE platform = $1 AND id = $2",
            [this.platform, beatmapSetId]
        );
        return row?.attachment ?? null;
    }

    async storeCover(beatmapSetId: number, attachment: string): Promise<void> {
        await this.db.run(
            `INSERT INTO covers (platform, id, attachment)
             VALUES ($1, $2, $3)
             ON CONFLICT (platform, id) DO UPDATE SET attachment = EXCLUDED.attachment`,
            [this.platform, beatmapSetId, attachment]
        );
    }

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

    async removeEmpty(): Promise<void> {
        await this.db.run("DELETE FROM covers WHERE platform = $1 AND attachment = $2", [this.platform, ""]);
        await this.db.run("DELETE FROM photos WHERE platform = $1 AND attachment = $2", [this.platform, ""]);
    }
}
