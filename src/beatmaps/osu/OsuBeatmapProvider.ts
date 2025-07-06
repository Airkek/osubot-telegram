import { IBeatmapProvider } from "../IBeatmapProvider";
import { OsuBeatmap } from "./OsuBeatmap";
import BanchoAPIV2 from "../../api/BanchoV2";
import { APIBeatmap, BeatmapStatus } from "../../Types";
import { IOsuBeatmapMetadata, OsuBeatmapCacheModel } from "../../data/Models/OsuBeatmapCacheModel";

export class OsuBeatmapProvider implements IBeatmapProvider {
    private api: BanchoAPIV2;
    private db: OsuBeatmapCacheModel;

    constructor(api: BanchoAPIV2, db: OsuBeatmapCacheModel) {
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

    private async buildFromApi(beatmap: APIBeatmap, mode?: number): Promise<OsuBeatmap> {
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

    private async buildFromCache(beatmap: IOsuBeatmapMetadata, mode?: number) {
        const osuBeatmap = new OsuBeatmap(undefined, beatmap);
        await osuBeatmap.asMode(mode ?? osuBeatmap.native_mode);
        return osuBeatmap;
    }
}
