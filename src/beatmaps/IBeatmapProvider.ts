import { IBeatmap } from "./BeatmapTypes";

export interface IBeatmapProvider {
    getBeatmapById(id: number, mode: number): Promise<IBeatmap>;
    getBeatmapByHash(hash: string, mode: number): Promise<IBeatmap>;
}
