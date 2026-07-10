import { afterAll, expect, test } from "@jest/globals";
import path from "node:path";
import client from "../src/osu_specific/pp/OfficialCalculatorClient";
import Mods from "../src/osu_specific/pp/Mods";
import {
    OfficialBeatmapAttributes,
    OfficialPerformanceAttributes,
    OfficialReplay,
    OfficialReplayHeader,
} from "../src/osu_specific/pp/OfficialCalculator";

global.logger = {
    error() {},
} as typeof global.logger;

const beatmapPath = path.resolve("tests", "fixtures", "official-calculator.osu");
const maniaBeatmapPath = path.resolve("tests", "fixtures", "official-calculator-mania.osu");
const replayPath = path.resolve("tests", "fixtures", "official-lazer-replay.osr");
const mods = [
    { acronym: "HD", settings: { only_fade_approach_circles: true } },
    { acronym: "DT", settings: { speed_change: 1.35 } },
    {
        acronym: "DA",
        settings: {
            circle_size: 6.5,
            approach_rate: 9.3,
            overall_difficulty: 8.7,
            drain_rate: 4.2,
        },
    },
];

afterAll(() => client.stop());

test("official osu! worker calculates lazer difficulty and performance with mod settings", async () => {
    const difficulty = await client.request<OfficialBeatmapAttributes>({
        operation: "beatmap",
        beatmap_path: beatmapPath,
        mode: 0,
        mods,
    });
    const performance = await client.request<OfficialPerformanceAttributes>({
        operation: "performance",
        beatmap_path: beatmapPath,
        mode: 0,
        mods,
        score: {
            accuracy: 1,
            combo: 4,
            total_score: 987654,
            legacy: false,
            standardised: true,
            simulate: false,
            statistics: { great: 3, slider_tail_hit: 1 },
        },
    });

    expect(difficulty.star_rating).toBeCloseTo(0.26669589226698054, 12);
    expect(difficulty.max_combo).toBe(4);
    expect(difficulty.circle_size).toBeCloseTo(6.5, 6);
    expect(difficulty.approach_rate).toBeCloseTo(10.259259223937988, 6);
    expect(difficulty.clock_rate).toBeCloseTo(1.35, 12);
    expect(performance.pp).toBeCloseTo(36.5921848438038, 10);
    expect(performance.fc_pp).toBeCloseTo(performance.pp, 12);
    expect(performance.ss_pp).toBeCloseTo(performance.pp, 12);
});

test("official osu! worker preserves the native mania ruleset", async () => {
    const difficulty = await client.request<OfficialBeatmapAttributes>({
        operation: "beatmap",
        beatmap_path: maniaBeatmapPath,
        mode: 3,
        mods: [],
    });

    expect(difficulty.native_mode).toBe(3);
    expect(difficulty.hit_object_count).toBe(4);
});

test("official osu! replay decoder preserves all lazer mods and settings", async () => {
    const header = await client.request<OfficialReplayHeader>({
        operation: "replay_header",
        replay_path: replayPath,
    });
    const replay = await client.request<OfficialReplay>({
        operation: "replay",
        replay_path: replayPath,
        beatmap_path: beatmapPath,
    });

    expect(header.mode).toBe(0);
    expect(header.version).toBeGreaterThanOrEqual(30_000_000);
    expect(header.beatmap_hash).toBe("6b6b06c384aa8009ba39e7ab16739b6e");
    expect(replay.player).toBe("lazer fixture");
    expect(replay.frame_count).toBe(2);
    expect(replay.legacy).toBe(false);
    expect(replay.mods).toEqual(mods);

    const parsedMods = new Mods(replay.mods);
    expect(parsedMods.toExtendedMods()).toEqual([
        { acronym: "HD", settings: { only_fade_approach_circles: true } },
        { acronym: "DT", settings: { speed_change: 1.35 }, rate: 1.35 },
        {
            acronym: "DA",
            settings: {
                circle_size: 6.5,
                approach_rate: 9.3,
                drain_rate: 4.2,
                overall_difficulty: 8.7,
            },
        },
    ]);
});
