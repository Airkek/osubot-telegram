import { describe, expect, test } from "@jest/globals";
import { IBeatmap } from "../src/beatmaps/BeatmapTypes";
import TopScore from "../src/event_handlers/templates/TopScore";
import { ppValuesLookEqual, shouldDisplayPpEstimate } from "../src/osu_specific/pp/PPDisplay";
import { IPPCalculator } from "../src/osu_specific/pp/Calculator";
import Mods from "../src/osu_specific/pp/Mods";
import { APIScore, HitCounts } from "../src/Types";

describe("PP display", () => {
    test("hides an FC estimate that is identical at the displayed precision", () => {
        expect(shouldDisplayPpEstimate(375.372, 375.37156416675094, 375.371442419313)).toBe(false);
        expect(shouldDisplayPpEstimate(357.213, 357.2141199103166, 357.21398456025935)).toBe(false);
    });

    test("hides an FC estimate when the calculated score is already full combo", () => {
        expect(shouldDisplayPpEstimate(332.345, 332.34472347092, 332.34472347092)).toBe(false);
    });

    test("shows a materially different FC estimate", () => {
        expect(shouldDisplayPpEstimate(328.567, 328.567657, 372.831436)).toBe(true);
    });

    test("compares PP using the same two decimals shown to the user", () => {
        expect(ppValuesLookEqual(375.371564, 375.371442)).toBe(true);
        expect(ppValuesLookEqual(328.567657, 372.831436)).toBe(false);
    });

    test("shows a different FC estimate in legacy top-score text", async () => {
        const mods = new Mods("DTCL");
        const beatmap = {
            id: 1981872,
            artist: "THEATRE BROOK",
            title: "Uragiri no Yuuyake",
            version: "Deception",
            author: "Nevo",
            status: "Ranked",
            maxCombo: 544,
            stats: { toString: () => "01:15 | 6.92✩" },
        } as IBeatmap;
        const score = {
            beatmapId: beatmap.id,
            score: 1_000_000,
            combo: 465,
            counts: new HitCounts({ 300: 363, 100: 13, 50: 0, miss: 0 }, 0),
            mods,
            mode: 0,
            rank: "S",
            date: new Date(2021, 9, 13, 17, 56),
            pp: 328.567,
            accuracy: () => 0.9769,
        } satisfies APIScore;
        const calculator = {
            map: beatmap,
            mods,
            speedMultiplier: 1.5,
            calculate: async () => ({ pp: 328.567657, fc: 372.831436, ss: 400 }),
        } satisfies IPPCalculator;
        const localizer = { tr: (key: string) => key };

        const message = await TopScore(localizer, score, beatmap, 7, calculator, "https://osu.ppy.sh");

        expect(message).toContain("PP: 328.57 → FC: 372.83");
    });
});
