import { APIBeatmap, CalcArgs, HitCounts, IBeatmapStats, ICommandArgs, PPArgs } from "./Types";
import { CatchStats, ICalcStats, ManiaStats, OsuStats, TaikoStats } from "./pp/Stats";
import { InlineKeyboard } from "grammy";

interface Err {
    e: string;
    t: string;
}

interface IKBButton {
    text: string;
    command: string;
}

const errors: Err[] = [
    {
        e: "User not found",
        t: "Игрок не найден!",
    },
    {
        e: "No top scores",
        t: "Нет топ скоров!",
    },
    {
        e: "No recent scores",
        t: "Нет последних скоров!",
    },
    {
        e: "No scores",
        t: "Не найдено скоров!",
    },
    {
        e: "No scores found",
        t: "Не найдено скоров!",
    },
    {
        e: "Beatmap not found",
        t: "Невозможно получить данные о карте!",
    },
];

export default {
    round(num: number, p: number): number {
        return Math.round(num * 10 ** p) / 10 ** p;
    },
    profileModes: ["STD", "Taiko", "Catch", "Mania"],
    getStats(stats: IBeatmapStats, mode: number): ICalcStats {
        switch (mode) {
            case 1:
                return new TaikoStats(stats);
            case 2:
                return new CatchStats(stats);
            case 3:
                return new ManiaStats(stats);
            default:
                return new OsuStats(stats);
        }
    },
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
    parseArgs(args: string[]): ICommandArgs {
        const iArg: ICommandArgs = {
            full: args,
            string: [],
            nickname: [],
            mods: "",
            combo: 0,
            miss: 0,
            acc: 0,
            place: 0,
            apx: 0,
            more: 0,
            c50: 0,
            page: 1,
            mode: null,
        };

        for (let i = args.length - 1; i > -1; i--) {
            const arg = args[i].toLowerCase();
            if (arg == "-std" || arg == "-osu" || arg == "-s" || arg == "-o") {
                iArg.mode = 0;
            } else if (arg == "-taiko" || arg == "-drums" || arg == "-t") {
                iArg.mode = 1;
            } else if (arg == "-fruits" || arg == "-ctb" || arg == "-c" || arg == "-catch") {
                iArg.mode = 2;
            } else if (arg == "-mania" || arg == "-m") {
                iArg.mode = 3;
            } else if (arg.startsWith("+")) {
                iArg.mods = arg.slice(1);
            } else if (arg.endsWith("x")) {
                iArg.combo = Number(arg.slice(0, -1));
                iArg.nickname.push(arg);
            } else if (arg.endsWith("x50")) {
                iArg.c50 = Math.max(Number(arg.slice(0, -3)), 0);
                iArg.nickname.push(arg);
            } else if (arg.endsWith("m")) {
                iArg.miss = Number(arg.slice(0, -1));
                iArg.nickname.push(arg);
            } else if (arg.endsWith("%")) {
                iArg.acc = Number(arg.slice(0, -1));
            } else if (arg.startsWith("\\")) {
                iArg.place = Number(arg.slice(1));
            } else if (arg.startsWith("~")) {
                iArg.apx = Math.max(Number(arg.slice(1)), 1);
            } else if (arg.startsWith("--p")) {
                iArg.page = Math.max(Number(arg.slice(3)), 1);
            } else if (arg.startsWith(">")) {
                iArg.more = Math.max(Number(arg.slice(1)), 1);
            } else {
                iArg.string.push(arg);
                iArg.nickname.push(arg);
            }
        }

        iArg.string.reverse();
        iArg.nickname.reverse();

        return iArg;
    },
    formatCombo(combo: number, full: number): string {
        if (!full) {
            return `${combo}x`;
        }
        return `${combo}x/${full}x`;
    },
    formatBeatmap: function (map: APIBeatmap): string {
        const data: string[] = [];

        data.push(`${map.artist} - ${map.title} [${map.version}] by ${map.creator.nickname} (${map.status})`);

        if (map.length !== undefined && !isNaN(map.length)) {
            data.push(this.formatBeatmapLength(map.length));
        }
        if (map.stats !== undefined && map.stats.toString() !== "") {
            data.push(map.stats.toString());
        }
        if (map.bpm !== undefined && !isNaN(map.bpm)) {
            data.push(`${Math.round(map.bpm)}BPM`);
        }
        if (map.diff.stars !== undefined && !isNaN(map.diff.stars)) {
            data.push(`${this.round(map.diff.stars, 2)}✩`);
        }

        return data.join(" | ");
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
    error(e: string): string {
        const f = errors.find((er) => er.e == e);
        return f ? f.t : "Неизвестная ошибка!";
    },
    scoreNum(amount: number): string {
        if (amount > 10 && amount < 20) {
            return "скоров";
        }
        switch (amount % 10) {
            case 1:
                return "скор";
            case 2:
            case 3:
            case 4:
                return "скора";
            default:
                return "скоров";
        }
    },
    createKeyboard(rows: IKBButton[][]): InlineKeyboard {
        const buttonRows = rows.map((row) => row.map((button) => InlineKeyboard.text(button.text, button.command)));
        return InlineKeyboard.from(buttonRows);
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
            get seconds() {
                return Math.ceil((new Date().getTime() - timeStart) / 1000) + "s";
            },
            get ms() {
                return new Date().getTime() - timeStart + "ms";
            },
            reset() {
                timeStart = new Date().getTime();
            },
        };
    },
};
