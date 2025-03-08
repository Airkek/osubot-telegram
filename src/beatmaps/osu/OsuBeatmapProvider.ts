import { IBeatmapProvider } from "../IBeatmapProvider";
import { OsuBeatmap } from "./OsuBeatmap";
import BanchoAPIV2 from "../../api/BanchoV2";
import { APIBeatmap } from "../../Types";

export class OsuBeatmapProvider implements IBeatmapProvider {
    private api: BanchoAPIV2;

    constructor(api: BanchoAPIV2) {
        this.api = api;
    }

    async getBeatmapByHash(hash: string, mode?: number): Promise<OsuBeatmap> {
        const beatmap = await this.api.getBeatmap(hash);
        return await this.getBeatmap(beatmap, mode);
    }

    async getBeatmapById(id: number, mode?: number): Promise<OsuBeatmap> {
        const beatmap = await this.api.getBeatmap(id);
        return await this.getBeatmap(beatmap, mode);
    }

    private async getBeatmap(beatmap: APIBeatmap, mode?: number): Promise<OsuBeatmap> {
        const osuBeatmap = new OsuBeatmap(beatmap);
        await osuBeatmap.asMode(mode ?? osuBeatmap.mode);
        return osuBeatmap;
    }
}
