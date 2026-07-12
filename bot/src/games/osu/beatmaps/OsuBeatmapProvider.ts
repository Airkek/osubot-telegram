import { IBeatmapData } from "games/beatmaps/IBeatmapData";
import { BeatmapStatus } from "games/osu/BeatmapStatus";
import { IBeatmapProvider } from "games/IBeatmapProvider";
import { OsuBeatmap } from "games/osu/beatmaps/OsuBeatmap";
import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";
import { IBeatmapCacheRepository } from "core/storage/IBeatmapCacheRepository";
import { IBeatmapMetadata } from "core/storage/IBeatmapMetadata";

export class OsuBeatmapProvider implements IBeatmapProvider {
    private api: BanchoV2ApiClient;
    private db: IBeatmapCacheRepository;

    constructor(api: BanchoV2ApiClient, db: IBeatmapCacheRepository) {
        this.api = api;
        this.db = db;
    }

    async getBeatmapByHash(hash: string, mode?: number): Promise<OsuBeatmap> {
        const dbMap = await this.db.getBeatmapByHash(hash);
        if (dbMap) {
            return await this.buildFromCache(dbMap, mode);
        }
        const beatmap = await this.api.getBeatmap(hash);
        return await this.buildFromApi(beatmap, mode);
    }

    async getBeatmapById(id: number, mode?: number): Promise<OsuBeatmap> {
        const dbMap = await this.db.getBeatmapById(id);
        if (dbMap) {
            return await this.buildFromCache(dbMap, mode);
        }
        const beatmap = await this.api.getBeatmap(id);
        return await this.buildFromApi(beatmap, mode);
    }

    private async buildFromApi(beatmap: IBeatmapData, mode?: number): Promise<OsuBeatmap> {
        const osuBeatmap = new OsuBeatmap(beatmap);
        await osuBeatmap.asMode(mode ?? osuBeatmap.native_mode);

        switch (beatmap.status) {
            case BeatmapStatus[BeatmapStatus.Approved]:
            case BeatmapStatus[BeatmapStatus.Loved]:
            case BeatmapStatus[BeatmapStatus.Ranked]:
                await this.db.addToCache(osuBeatmap);
                global.logger.info(`New beatmap in cache (id: ${osuBeatmap.id}, hash: ${osuBeatmap.hash})`);
                break;
        }

        return osuBeatmap;
    }

    private async buildFromCache(beatmap: IBeatmapMetadata, mode?: number) {
        const osuBeatmap = new OsuBeatmap(undefined, beatmap);
        await osuBeatmap.asMode(mode ?? osuBeatmap.native_mode);
        return osuBeatmap;
    }
}
