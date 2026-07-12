import { describe, expect, test } from "@jest/globals";
import { Mods, ModsBitwise } from "../src/games/osu/performance/Mods";

describe("Mods string parser", () => {
    test("preserves lazer-only mods in compact combinations", () => {
        const mods = new Mods("HDDTTC");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "HD" }, { acronym: "DT" }, { acronym: "TC" }]);
        expect(mods.sum()).toBe(ModsBitwise.Hidden | ModsBitwise.DoubleTime);
        expect(mods.toString()).toBe("+HD +DT +TC");
        expect(mods.isLazer()).toBe(true);
    });

    test("does not collapse lazer-only mods into No Mod", () => {
        const noMod = new Mods("NM");
        const traceable = new Mods("TC");

        expect(noMod.sum()).toBe(0);
        expect(traceable.sum()).toBe(0);
        expect(noMod.toExtendedMods()).toEqual([]);
        expect(traceable.toExtendedMods()).toEqual([{ acronym: "TC" }]);
    });

    test("normalizes legacy aliases and keeps custom clock rates", () => {
        const mods = new Mods("K4V2DTx1.25");

        expect(mods.toExtendedMods()).toEqual([
            { acronym: "4K" },
            { acronym: "SV2" },
            { acronym: "DT", settings: { speed_change: 1.25 }, rate: 1.25 },
        ]);
        expect(mods.speed()).toBe(1.25);
    });

    test("keeps Classic as the lazer score switch", () => {
        const mods = new Mods("HDTCCL");

        expect(mods.toAcronymList()).toEqual(["HD", "TC", "CL"]);
        expect(mods.isLazer()).toBe(false);
    });

    test("parses and displays Difficulty Adjust settings", () => {
        const mods = new Mods("HDDTDA[cs=4,ar=9.5,od=8.2,hp=6]TC");

        expect(mods.toExtendedMods()).toEqual([
            { acronym: "HD" },
            { acronym: "DT" },
            {
                acronym: "DA",
                settings: {
                    approach_rate: 9.5,
                    circle_size: 4,
                    overall_difficulty: 8.2,
                    drain_rate: 6,
                },
            },
            { acronym: "TC" },
        ]);
        expect(mods.toString()).toBe("+HD +DT +DA[CS=4,AR=9.5,OD=8.2,HP=6] +TC");
    });

    test("enables extended Difficulty Adjust limits when needed", () => {
        const mods = new Mods("DA[ar=-5,od=11]");

        expect(mods.toExtendedMods()).toEqual([
            {
                acronym: "DA",
                settings: {
                    approach_rate: -5,
                    overall_difficulty: 11,
                    extended_limits: true,
                },
            },
        ]);
        expect(mods.toString()).toBe("+DA[AR=-5,OD=11]");
    });

    test.each([
        ["DA[cs=5]", "circle_size", 5, "+DA[CS=5]"],
        ["DA[ar=8.5]", "approach_rate", 8.5, "+DA[AR=8.5]"],
        ["DA[od=7.2]", "overall_difficulty", 7.2, "+DA[OD=7.2]"],
        ["DA[hp=6]", "drain_rate", 6, "+DA[HP=6]"],
        ["DA[sc=1.25]", "scroll_speed", 1.25, "+DA[SC=1.25]"],
    ])("maps %s to the official %s setting", (input, setting, value, output) => {
        const mods = new Mods(input);

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA", settings: { [setting]: value } }]);
        expect(mods.toString()).toBe(output);
    });

    test("accepts settings in any order and displays them canonically", () => {
        const mods = new Mods("da[hp=6,od=7,ar=8,cs=4]");

        expect(mods.toString()).toBe("+DA[CS=4,AR=8,OD=7,HP=6]");
    });

    test("supports compact settings without commas", () => {
        const mods = new Mods("DA[CS4AR8.5OD7HP6]");

        expect(mods.toString()).toBe("+DA[CS=4,AR=8.5,OD=7,HP=6]");
    });

    test("uses the last duplicate setting", () => {
        const mods = new Mods("DA[cs=4,cs=5]");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA", settings: { circle_size: 5 } }]);
    });

    test("merges repeated Difficulty Adjust blocks", () => {
        const mods = new Mods("DA[cs=4]DA[ar=9]");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA", settings: { circle_size: 4, approach_rate: 9 } }]);
        expect(mods.toString()).toBe("+DA[CS=4,AR=9]");
    });

    test("ignores unknown settings and malformed values inside the block", () => {
        const mods = new Mods("DA[foo=1,cs=no,ar=8]");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA", settings: { approach_rate: 8 } }]);
    });

    test("does not leak an unclosed settings block into mod acronyms", () => {
        const mods = new Mods("DA[cs=5");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA" }]);
        expect(mods.toString()).toBe("+DA");
    });

    test("keeps empty Difficulty Adjust as a mod with default settings", () => {
        const mods = new Mods("DA[]");

        expect(mods.toExtendedMods()).toEqual([{ acronym: "DA" }]);
        expect(mods.toString()).toBe("+DA");
    });

    test("does not enable extended limits for boundary values", () => {
        const mods = new Mods("DA[cs=0,ar=10,od=10,hp=0]");
        const [difficultyAdjust] = mods.toExtendedMods();

        expect(difficultyAdjust.settings?.extended_limits).toBeUndefined();
    });

    test("returns defensive copies of Difficulty Adjust settings", () => {
        const mods = new Mods("DA[cs=5]");
        const first = mods.toExtendedMods();
        first[0].settings.circle_size = 7;

        expect(mods.toExtendedMods()[0].settings?.circle_size).toBe(5);
    });

    test("omits settings metadata when only API-compatible acronyms are requested", () => {
        const mods = new Mods("HDDTDA[cs=5,ar=9]");

        expect(mods.toAcronymList(true)).toEqual(["HD", "DT", "DA"]);
    });
});
