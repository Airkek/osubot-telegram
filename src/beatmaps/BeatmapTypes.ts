import Mods from "../pp/Mods";

export interface IBeatmapStats {
    toString(): string;
}

export interface IBeatmap {
    readonly id: number;
    readonly setId: number;
    readonly hash: string;
    readonly mode: number;

    readonly title: string;
    readonly artist: string;

    readonly version: string;
    readonly author: string;
    readonly status: string;

    readonly maxCombo: number;
    readonly hitObjectsCount: number;

    readonly stats: IBeatmapStats;

    readonly url?: string;
    readonly coverUrl?: string;

    asMode(mode: number): Promise<void>;
    applyMods(mods: Mods): Promise<void>;
}
