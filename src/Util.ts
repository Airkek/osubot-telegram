import { IBeatmapStats, HitCounts, ICommandArgs, IHits, PPArgs, CalcArgs, APIBeatmap } from "./Types";
import { ICalcStats, OsuStats, TaikoStats, CatchStats, ManiaStats } from "./pp/Stats";
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
    hash(length: number = 10): string {
        const characters = "0123456789abcdef";
        let string = "";
        for (let i = 0; i < length; i++) {
            string += characters[Math.floor(Math.random() * characters.length)];
        }

        return string;
    },
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
    getHitsFromAcc: {
        osu(acc: number, miss: number, obj: number, c50 = 0): IHits {
            const hits = {
                300: -1,
                100: 0,
                50: c50,
                miss,
            };
            let n300 = hits[300];
            if (n300 < 0) {
                n300 = Math.max(0, obj - hits[100] - hits[50] - hits.miss);
            }

            let hitcount = n300 + hits[100] + hits[50] + hits.miss;

            if (hitcount > obj) {
                n300 -= Math.min(n300, hitcount - obj);
            }

            hitcount = n300 + hits[100] + hits[50] + hits.miss;

            if (hitcount > obj) {
                hits[100] -= Math.min(hits[100], hitcount - obj);
            }

            hitcount = n300 + hits[100] + hits[50] + hits.miss;

            if (hitcount > obj) {
                hits[50] -= Math.min(hits[50], hitcount - obj);
            }

            hitcount = n300 + hits[100] + hits[50] + hits.miss;

            hits[300] = obj - hits[100] - hits[50] - hits.miss;

            const max300 = obj - hits.miss;

            hits[100] = Math.round(-3 * ((acc * 0.01 - 1) * obj + hits.miss) * 0.5);

            if (hits[100] > max300) {
                hits[100] = 0;
                hits[50] = Math.round(-6 * ((acc * 0.01 - 1) * obj + hits.miss) * 0.5);
                hits[50] = Math.min(max300, hits[50]);
            }

            hits[300] = obj - hits[100] - hits[50] - hits.miss;

            return hits;
        },
    },
    formatCombo(combo: number, full: number): string {
        if (!full) {
            return `${combo}x`;
        }
        return `${combo}x/${full}x`;
    },
    formatBeatmap(map: APIBeatmap): string {
        return `${map.artist} - ${map.title} [${map.version}] by ${map.creator.nickname} (${map.status})
${this.formatBeatmapLength(map.length)} | ${map.stats} ${Math.round(map.bpm)}BPM | ${this.round(map.diff.stars, 2)}✩`;
    },
    formatDate(d: Date, crop: boolean = false) {
        if (!crop) {
            return `${this.fixNumberLength(d.getDate())}.${this.fixNumberLength(d.getMonth() + 1)}.${this.fixNumberLength(d.getFullYear())} ${this.fixNumberLength(d.getHours())}:${this.fixNumberLength(d.getMinutes())}`;
        }
        return `${this.fixNumberLength(d.getDate())}.${this.fixNumberLength(d.getMonth() + 1)}.${this.fixNumberLength(d.getFullYear())}`;
    },
    async sleep(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
    },
    createPPArgs(args: PPArgs, mode: number): CalcArgs {
        return new CalcArgs(args, mode);
    },
    error(e: string): string {
        const f = errors.find((er) => er.e == e);
        return f ? f.t : "Неизвестная ошибка!";
    },
    donater(status: number | string): string {
        const icons = {
            poop: "💩",
            1001: "💩",
            frog: "🐸",
            1002: "🐸",
            pig: "🐷",
            1003: "🐷",
            sunglasses: "😎",
            1004: "😎",
            stop: "⛔",
            1005: "⛔",
            verified: "✅",
            1006: "✅",
            jp: "🇯🇵",
            1007: "🇯🇵",
            skull: "💀",
            1008: "💀",
            car: "🚓",
            1009: "🚓",
            orange: "🍊",
            1010: "✨",
            sparkles: "✨",
            0: "",
            supporter: "💖",
            heart: "💖",
            1: "💖",
            crown: "👑",
            owner: "👑",
            228: "👑",
        };
        return icons[status] || "";
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
};
