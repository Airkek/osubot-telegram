import { IBeatmapProvider } from "../IBeatmapProvider";
import { OsuBeatmap } from "./OsuBeatmap";
import BanchoAPIV2 from "../../api/BanchoV2";
import { APIBeatmap } from "../../Types";
import Mods from "../../pp/Mods";

export class OsuBeatmapProvider implements IBeatmapProvider {
    private api: BanchoAPIV2;

    constructor(api: BanchoAPIV2) {
        this.api = api;
    }

    async getBeatmapByHash(hash: string, mode?: number): Promise<OsuBeatmap> {
        const beatmap = await this.api.getBeatmap(hash, mode);
        return await this.getBeatmap(beatmap);
    }

    async getBeatmapById(id: number, mode?: number): Promise<OsuBeatmap> {
        const beatmap = await this.api.getBeatmap(id, mode);
        return await this.getBeatmap(beatmap);
    }

    private async getBeatmap(beatmap: APIBeatmap): Promise<OsuBeatmap> {
        const osuBeatmap = new OsuBeatmap(beatmap);
        await osuBeatmap.applyMods(new Mods([])); // ensure osu file downloaded and calculate star rating
        return osuBeatmap;
    }
}
