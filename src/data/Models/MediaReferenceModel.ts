import { MediaReferenceCache } from "../../core/ApplicationStorage";
import { SqlExecutor } from "../SqlExecutor";

interface StoredAttachment {
    attachment: string;
}

export class MediaReferenceModel implements MediaReferenceCache {
    constructor(private readonly db: SqlExecutor) {}

    async getCover(beatmapSetId: number): Promise<string | null> {
        const row = await this.db.get<StoredAttachment>("SELECT attachment FROM covers WHERE id = $1", [beatmapSetId]);
        return row?.attachment ?? null;
    }

    async storeCover(beatmapSetId: number, attachment: string): Promise<void> {
        await this.db.run("INSERT INTO covers (id, attachment) VALUES ($1, $2)", [beatmapSetId, attachment]);
    }

    async getPhoto(url: string): Promise<string | null> {
        const row = await this.db.get<StoredAttachment>("SELECT attachment FROM photos WHERE url = $1", [url]);
        return row?.attachment ?? null;
    }

    async storePhoto(url: string, attachment: string): Promise<void> {
        await this.db.run("INSERT INTO photos (url, attachment) VALUES ($1, $2)", [url, attachment]);
    }

    async removeEmpty(): Promise<void> {
        await this.db.run("DELETE FROM covers WHERE attachment = $1", [""]);
        await this.db.run("DELETE FROM photos WHERE attachment = $1", [""]);
    }
}
