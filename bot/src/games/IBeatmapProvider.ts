import { IBeatmap } from "games/IBeatmap";

export interface IBeatmapProvider {
    getBeatmapById(id: number, mode: number): Promise<IBeatmap>;
    getBeatmapByHash(hash: string, mode: number): Promise<IBeatmap>;
}
