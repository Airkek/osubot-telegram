import { Util } from "shared/Util";
import { IExtendedMod } from "games/osu/performance/IExtendedMod";

export enum ModsBitwise {
    Nomod = 0,
    NoFail = 1 << 0,
    Easy = 1 << 1,
    TouchDevice = 1 << 2,
    Hidden = 1 << 3,
    HardRock = 1 << 4,
    SuddenDeath = 1 << 5,
    DoubleTime = 1 << 6,
    Relax = 1 << 7,
    HalfTime = 1 << 8,
    Nightcore = 1 << 9,
    Flashlight = 1 << 10,
    Autoplay = 1 << 11,
    SpunOut = 1 << 12,
    Relax2 = 1 << 13,
    Perfect = 1 << 14,
    Key4 = 1 << 15,
    Key5 = 1 << 16,
    Key6 = 1 << 17,
    Key7 = 1 << 18,
    Key8 = 1 << 19,
    FadeIn = 1 << 20,
    Random = 1 << 21,
    Cinema = 1 << 22,
    Target = 1 << 23,
    Key9 = 1 << 24,
    Key10 = 1 << 25,
    Key1 = 1 << 26,
    Key3 = 1 << 27,
    Key2 = 1 << 28,
    ScoreV2 = 1 << 29,
    Mirror = 1 << 30,
    DifficultyChanging = Easy | HardRock | DoubleTime | HalfTime | Nightcore,
    Unranked = Relax | Autoplay | Relax2 | Cinema | Target | ScoreV2,
}

enum ModsAcronyms2 {
    NoFail = "NF",
    Easy = "EZ",
    TouchDevice = "TD",
    Hidden = "HD",
    HardRock = "HR",
    SuddenDeath = "SD",
    DoubleTime = "DT",
    Relax = "RX",
    HalfTime = "HT",
    Nightcore = "NC",
    Flashlight = "FL",
    Autoplay = "AT",
    SpunOut = "SO",
    Relax2 = "AP",
    Perfect = "PF",
    Key4 = "4K",
    Key5 = "5K",
    Key6 = "6K",
    Key7 = "7K",
    Key8 = "8K",
    FadeIn = "FI",
    Random = "RN",
    Cinema = "CN",
    Target = "TP",
    Key9 = "9K",
    Key10 = "10K",
    Key1 = "1K",
    Key3 = "3K",
    Key2 = "2K",
    ScoreV2 = "SV2",
    Mirror = "MR",
}

enum AcrToNum {
    NF = 1 << 0,
    EZ = 1 << 1,
    TD = 1 << 2,
    HD = 1 << 3,
    HR = 1 << 4,
    SD = 1 << 5,
    DT = 1 << 6,
    RX = 1 << 7,
    HT = 1 << 8,
    NC = 1 << 9,
    FL = 1 << 10,
    AT = 1 << 11,
    SO = 1 << 12,
    AP = 1 << 13,
    PF = 1 << 14,
    K4 = 1 << 15,
    K5 = 1 << 16,
    K6 = 1 << 17,
    K7 = 1 << 18,
    K8 = 1 << 19,
    FI = 1 << 20,
    RN = 1 << 21,
    CN = 1 << 22,
    TP = 1 << 23,
    K9 = 1 << 24,
    KX = 1 << 25,
    K1 = 1 << 26,
    K3 = 1 << 27,
    K2 = 1 << 28,
    V2 = 1 << 29,
    MR = 1 << 30,
}

const USER_ACRONYM_ALIASES: Record<string, string> = {
    K1: "1K",
    K2: "2K",
    K3: "3K",
    K4: "4K",
    K5: "5K",
    K6: "6K",
    K7: "7K",
    K8: "8K",
    K9: "9K",
    KX: "10K",
    K10: "10K",
    V2: "SV2",
};

const BITWISE_ACRONYM_ALIASES: Record<string, string> = {
    "1K": "K1",
    "2K": "K2",
    "3K": "K3",
    "4K": "K4",
    "5K": "K5",
    "6K": "K6",
    "7K": "K7",
    "8K": "K8",
    "9K": "K9",
    "10K": "KX",
    SV2: "V2",
};

const THREE_CHARACTER_ACRONYMS = ["10K", "K10", "SV2"];
const SPEED_CHANGING_ACRONYMS = ["DT", "NC", "HT", "DC"];
const DIFFICULTY_ADJUST_SETTINGS = [
    { acronym: "CS", key: "circle_size" },
    { acronym: "AR", key: "approach_rate" },
    { acronym: "OD", key: "overall_difficulty" },
    { acronym: "HP", key: "drain_rate" },
    { acronym: "SC", key: "scroll_speed" },
] as const;

type Mod =
    | "Nomod"
    | "NoFail"
    | "Easy"
    | "TouchDevice"
    | "Hidden"
    | "HardRock"
    | "SuddenDeath"
    | "DoubleTime"
    | "Relax"
    | "HalfTime"
    | "Nightcore"
    | "Flashlight"
    | "Autoplay"
    | "SpunOut"
    | "Relax2"
    | "Perfect"
    | "Key4"
    | "Key5"
    | "Key6"
    | "Key7"
    | "Key8"
    | "FadeIn"
    | "Random"
    | "Cinema"
    | "Target"
    | "Key9"
    | "Key10"
    | "Key1"
    | "Key3"
    | "Key2"
    | "ScoreV2"
    | "Mirror";

export class Mods {
    mods: number[];
    flags: number;
    modsv2: IExtendedMod[];
    speedMultiplierV2: number = undefined;
    lazer: boolean = true;
    constructor(m: number | string | IExtendedMod[]) {
        if (typeof m === "string") {
            this.modsv2 = this.fromString(m);
            this.flags = this.fromMods(this.modsv2);
        } else if (typeof m === "number") {
            this.flags = m;
            this.lazer = false;
        } else {
            this.modsv2 = m.map((mod) => ({
                acronym: mod.acronym.toUpperCase(),
                settings: mod.settings ? { ...mod.settings } : undefined,
            }));
            this.flags = this.fromMods(this.modsv2);
        }
        this.mods = this.parse(this.flags);
    }

    parse(m: number): number[] {
        const r = [];
        for (let i = 0; i < 31; i++) {
            if (m & (1 << i)) {
                r.push(1 << i);
            }
        }

        return r;
    }

    fromMods(mods: IExtendedMod[]): number {
        let flags = 0;
        for (const mod of mods) {
            const acronym = mod.acronym.toUpperCase();
            const bitwiseAcronym = BITWISE_ACRONYM_ALIASES[acronym] ?? acronym;
            if (AcrToNum[bitwiseAcronym]) {
                flags |= AcrToNum[bitwiseAcronym];
            }
            if (acronym === "NC") {
                flags |= ModsBitwise.DoubleTime;
            } else if (acronym === "PF") {
                flags |= ModsBitwise.SuddenDeath;
            }

            const idx = SPEED_CHANGING_ACRONYMS.indexOf(acronym);
            if (idx != -1) {
                if (mod.settings?.speed_change !== undefined) {
                    this.speedMultiplierV2 = mod.settings.speed_change;
                } else if (idx < 2) {
                    this.speedMultiplierV2 = 1.5;
                } else {
                    this.speedMultiplierV2 = 0.75;
                }
            }

            if (acronym == "CL") {
                this.lazer = false;
            }
        }

        return flags;
    }

    fromString(str: string): IExtendedMod[] {
        let offset = 0;
        const mods: IExtendedMod[] = [];
        const source = str.toUpperCase();

        while (offset < str.length) {
            if (/[,\s+]/.test(source[offset])) {
                offset++;
                continue;
            }

            const threeCharacterAcronym = THREE_CHARACTER_ACRONYMS.find(
                (acronym) => source.slice(offset, offset + acronym.length) === acronym
            );
            const rawAcronym = threeCharacterAcronym ?? source.slice(offset, offset + 2);
            if (rawAcronym.length < 2 || !/^[A-Z0-9]+$/.test(rawAcronym)) {
                offset++;
                continue;
            }
            offset += rawAcronym.length;

            const acronym = USER_ACRONYM_ALIASES[rawAcronym] ?? rawAcronym;
            if (acronym === "NM") {
                continue;
            }

            const mod: IExtendedMod = { acronym };
            if (acronym === "DA") {
                const openingBracket = source[offset];
                const closingBracket = openingBracket === "(" ? ")" : openingBracket === "[" ? "]" : "";
                const settingsEnd = closingBracket ? source.indexOf(closingBracket, offset + 1) : -1;
                if (settingsEnd !== -1) {
                    const settings = this.parseDifficultyAdjustSettings(source.slice(offset + 1, settingsEnd));
                    if (Object.keys(settings).length > 0) {
                        mod.settings = settings;
                    }
                    offset = settingsEnd + 1;
                } else if (closingBracket) {
                    offset = source.length;
                }
            } else if (SPEED_CHANGING_ACRONYMS.includes(acronym) && source[offset] === "X") {
                const rateMatch = source.slice(offset + 1).match(/^\d+(?:\.\d+)?/);
                if (rateMatch) {
                    mod.settings = { speed_change: Number(rateMatch[0]) };
                    offset += rateMatch[0].length + 1;
                }
            }

            const existing = mods.find((candidate) => candidate.acronym === mod.acronym);
            if (existing && mod.settings) {
                existing.settings = { ...existing.settings, ...mod.settings };
            } else if (!existing) {
                mods.push(mod);
            }
        }

        return mods;
    }

    private parseDifficultyAdjustSettings(source: string): IExtendedMod["settings"] {
        const settings: IExtendedMod["settings"] = {};
        const settingPattern = /(AR|CS|OD|HP|SC)\s*(?:=|:)?\s*(-?(?:\d+(?:\.\d*)?|\.\d+))/g;

        for (const match of source.matchAll(settingPattern)) {
            const setting = DIFFICULTY_ADJUST_SETTINGS.find((candidate) => candidate.acronym === match[1]);
            if (setting) {
                settings[setting.key] = Number(match[2]);
            }
        }

        const values = Object.values(settings).filter((value): value is number => typeof value === "number");
        if (values.some((value) => value < 0 || value > 10)) {
            settings.extended_limits = true;
        }

        return settings;
    }

    toExtendedMods(): IExtendedMod[] {
        if (this.modsv2) {
            return this.modsv2.map((m) => {
                const mod: IExtendedMod = {
                    acronym: m.acronym,
                    settings: m.settings ? { ...m.settings } : undefined,
                };
                if (m.settings?.speed_change !== undefined) {
                    mod.rate = m.settings.speed_change;
                }

                return mod;
            });
        }
        let tempMods = this.sum();
        if (this.sum() & ModsBitwise.Nightcore) {
            tempMods &= ~ModsBitwise.DoubleTime;
        }
        if (this.sum() & ModsBitwise.Perfect) {
            tempMods &= ~ModsBitwise.SuddenDeath;
        }
        const p = this.parse(tempMods);
        const str: IExtendedMod[] = p.map((mod) => {
            return {
                acronym: ModsAcronyms2[ModsBitwise[mod]],
            };
        });
        if (!this.lazer) {
            str.push({
                acronym: "CL",
            });
        }

        return str;
    }

    toAcronymList(ignoreMeta: boolean = false): string[] {
        return this.toExtendedMods().map((m) => {
            let mod = m.acronym;
            if (!ignoreMeta && m.rate !== undefined) {
                mod += "x" + Util.round(m.rate, 2);
            }
            if (!ignoreMeta && m.acronym === "DA" && m.settings) {
                const settings = DIFFICULTY_ADJUST_SETTINGS.flatMap((setting) => {
                    const value = m.settings?.[setting.key];
                    return typeof value === "number" ? [`${setting.acronym}=${value}`] : [];
                });
                if (settings.length > 0) {
                    mod += `[${settings.join(",")}]`;
                }
            }

            return mod;
        });
    }

    toString(): string {
        const list = this.toAcronymList(false);
        if (list.length == 0) {
            return "";
        }
        return "+" + list.join(" +");
    }

    diff() {
        return this.sum() & ModsBitwise.DifficultyChanging;
    }

    isLazer() {
        return this.lazer;
    }

    speed() {
        if (this.speedMultiplierV2 !== undefined) {
            return this.speedMultiplierV2;
        }

        const speed_up = ModsBitwise.DoubleTime | ModsBitwise.Nightcore;
        const speed_down = ModsBitwise.HalfTime;
        if ((this.flags & speed_up) != 0) {
            return 1.5;
        }

        if ((this.flags & speed_down) != 0) {
            return 0.75;
        }

        return 1;
    }

    sum(): number {
        return this.mods.length == 0 ? 0 : this.mods.reduce((a, b) => a + b);
    }

    has(mod: Mod): boolean {
        return this.mods.includes(ModsBitwise[mod]);
    }

    isEasy(): boolean {
        return this.has("Easy");
    }

    isHardRock(): boolean {
        return this.has("HardRock");
    }
}
