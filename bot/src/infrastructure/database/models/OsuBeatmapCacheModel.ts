import { ISqlExecutor } from "infrastructure/database/ISqlExecutor";
import { OsuBeatmap } from "games/osu/beatmaps/OsuBeatmap";
import { IBeatmapMetadata } from "core/storage/IBeatmapMetadata";

export { IBeatmapMetadata as IOsuBeatmapMetadata } from "core/storage/IBeatmapMetadata";

export class OsuBeatmapCacheModel {
    private db: ISqlExecutor;

    constructor(db: ISqlExecutor) {
        this.db = db;
    }

    async getBeatmapById(id: number): Promise<IBeatmapMetadata | null> {
        return await this.db.get<IBeatmapMetadata>("SELECT * FROM osu_beatmap_metadata WHERE id = $1", [id]);
    }

    async getBeatmapByHash(hash: string): Promise<IBeatmapMetadata | null> {
        return await this.db.get<IBeatmapMetadata>("SELECT * FROM osu_beatmap_metadata WHERE hash = $1", [hash]);
    }

    async addToCache(map: OsuBeatmap): Promise<void> {
        const byId = await this.getBeatmapById(map.id);
        if (byId) {
            if (byId.hash === map.hash) {
                return;
            }

            await this.db.run(
                `UPDATE osu_beatmap_metadata
                 SET set_id        = $1,
                     hash          = $2,
                     title         = $3,
                     artist        = $4,
                     version       = $5,
                     author        = $6,
                     author_id     = $7,
                     status        = $8,
                     native_mode   = $9,
                     native_length = $10,
                     cover_url     = $11
                 WHERE id = $12`,
                [
                    map.setId,
                    map.hash,
                    map.title,
                    map.artist,
                    map.version,
                    map.author,
                    map.authorId,
                    map.status,
                    map.native_mode,
                    map.native_length,
                    map.coverUrl,
                    map.id,
                ]
            );
            return;
        }

        await this.db.run(
            `INSERT INTO osu_beatmap_metadata
             (id, set_id, hash, title, artist, version, author, author_id, status, native_mode, native_length, cover_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                map.id,
                map.setId,
                map.hash,
                map.title,
                map.artist,
                map.version,
                map.author,
                map.authorId,
                map.status,
                map.native_mode,
                map.native_length,
                map.coverUrl,
            ]
        );
    }
}
