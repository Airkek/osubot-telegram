import { CalcArgs, HitCounts, PPArgs } from "./Types";
import { IBeatmap } from "./beatmaps/BeatmapTypes";
import { ILocalisator } from "./ILocalisator";

interface Err {
    e: string;
    t: string;
}

// TODO: move out of utils
export interface IKBButton {
    text: string;
    command: string;
}
export type IKeyboard = IKBButton[][];

const errors: Err[] = [
    {
        e: "User not found",
        t: "user-not-found",
    },
    {
        e: "No top scores",
        t: "no-top-scores",
    },
    {
        e: "No recent scores",
        t: "no-recent-scores",
    },
    {
        e: "No scores",
        t: "no-scores-found",
    },
    {
        e: "No scores found",
        t: "no-scores-found",
    },
    {
        e: "Beatmap not found",
        t: "beatmap-not-found",
    },
];

export default {
    round(num: number, p: number): number {
        if (!num) {
            return 0;
        }
        return Math.round(num * 10 ** p) / 10 ** p;
    },
    profileModes: ["STD", "Taiko", "Catch", "Mania"],
    fixNumberLength(num: number): string {
        if (num > 9) {
            return String(num);
        }
        return `0${String(num)}`;
    },
    formatBeatmapLength(length: number): string {
        length = Math.round(length);
        return `${this.fixNumberLength(Math.floor(length / 60))}:${this.fixNumberLength(length % 60)}`;
    },
    accuracy(counts: HitCounts): number {
        switch (counts.mode) {
            case 1:
                return (counts[300] * 2 + counts[100]) / ((counts[300] + counts[100] + counts[50] + counts.miss) * 2);
            case 2:
                return (
                    (counts[50] + counts[100] + counts[300]) /
                    (counts[50] + counts[100] + counts[300] + counts.miss + counts.katu)
                );
            case 3:
                return (
                    ((counts[300] + counts.geki) * 6 + counts.katu * 4 + counts[100] * 2 + counts[50]) /
                    ((counts[300] + counts[100] + counts.geki + counts.katu + counts[50] + counts.miss) * 6)
                );
            default:
                return (
                    (counts[300] * 6 + counts[100] * 2 + counts[50]) /
                    ((counts[300] + counts[100] + counts[50] + counts.miss) * 6)
                );
        }
    },
    formatCombo(combo: number, full: number): string {
        if (!full) {
            return `${combo}x`;
        }
        return `${combo}x/${full}x`;
    },
    formatBeatmap: function (map: IBeatmap): string {
        return `${map.artist} - ${map.title} [${map.version}] by ${map.author} (${map.status}) | ${map.stats.toString()}`;
    },
    formatDate(d: Date, crop: boolean = false): string {
        if (!crop) {
            return `${this.fixNumberLength(d.getDate())}.${this.fixNumberLength(d.getMonth() + 1)}.${this.fixNumberLength(d.getFullYear())} ${this.fixNumberLength(d.getHours())}:${this.fixNumberLength(d.getMinutes())}`;
        }
        return `${this.fixNumberLength(d.getDate())}.${this.fixNumberLength(d.getMonth() + 1)}.${this.fixNumberLength(d.getFullYear())}`;
    },
    createPPArgs(args: PPArgs, mode: number): CalcArgs {
        return new CalcArgs(args, mode);
    },
    error(e: string, l: ILocalisator): string {
        const f = errors.find((er) => er.e == e);
        return f ? l.tr(f.t) : l.tr("unknown-error");
    },
    getModeArg(mode: number) {
        return ["-std", "-taiko", "-ctb", "-mania"][mode];
    },
    minutesToPlaytimeString(time: number) {
        time = Math.round(time / 60);
        const minutes = time % 60;
        const hours = Math.floor(time / 60) % 24;
        const days = Math.floor(time / (60 * 24));

        return `${days}d ${hours}h ${minutes}m`;
    },
    timer() {
        let timeStart = new Date().getTime();
        return {
            get seconds(): string {
                return Math.ceil((new Date().getTime() - timeStart) / 1000) + "s";
            },
            get ms(): string {
                return new Date().getTime() - timeStart + "ms";
            },
            get seconds_raw(): number {
                return Math.ceil((new Date().getTime() - timeStart) / 1000);
            },
            get ms_raw(): number {
                return new Date().getTime() - timeStart;
            },
            reset() {
                timeStart = new Date().getTime();
            },
        };
    },
};
