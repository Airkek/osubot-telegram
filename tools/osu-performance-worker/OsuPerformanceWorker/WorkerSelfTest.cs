using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace OsuPerformanceWorker;

internal static class WorkerSelfTest
{
    private static readonly ModeFixture[] fixtures =
    [
        new(0, "osu!", 3, 4, osuBeatmap),
        new(1, "taiko", 6, 6, taikoBeatmap),
        new(2, "catch", 6, 6, catchBeatmap),
        new(3, "mania", 4, 6, maniaBeatmap)
    ];

    public static void Run()
    {
        foreach (ModeFixture fixture in fixtures)
        {
            var workingBeatmap = FileWorkingBeatmap.FromText(fixture.Beatmap);
            PerformanceResult result = CalculatorOperations.CalculatePerformance(
                workingBeatmap,
                fixture.Mode,
                [],
                new ScoreInput
                {
                    Accuracy = 0.95,
                    Combo = fixture.MaxCombo - 1,
                    TotalScore = 900_000,
                    Legacy = false,
                    Standardised = true,
                    Simulate = true,
                    Statistics = new Dictionary<string, int> { ["miss"] = 0 }
                });

            Require(result.Difficulty.NativeMode == fixture.Mode, fixture, "native ruleset was not preserved");
            Require(
                result.Difficulty.HitObjectCount == fixture.HitObjectCount,
                fixture,
                "hit objects were not decoded");
            Require(result.Difficulty.MaxCombo == fixture.MaxCombo, fixture, "maximum combo is incorrect");
            Require(
                double.IsFinite(result.Difficulty.StarRating) && result.Difficulty.StarRating > 0,
                fixture,
                "star rating was not calculated");
            Require(double.IsFinite(result.Pp) && result.Pp > 0, fixture, "performance was not calculated");
            Require(double.IsFinite(result.FcPp) && result.FcPp > 0, fixture, "FC performance was not calculated");
            Require(double.IsFinite(result.SsPp) && result.SsPp > 0, fixture, "SS performance was not calculated");

            string id = $"self-test-{fixture.Name}";
            string json = JsonConvert.SerializeObject(new WorkerResponse { Id = id, Result = result });
            JObject response = JObject.Parse(json);
            Require(response.Value<string>("id") == id, fixture, "response id was not serialized");
            Require(response["result"]?["pp"]?.Value<double>() is > 0, fixture, "performance was not serialized");
        }
    }

    private static void Require(bool condition, ModeFixture fixture, string message)
    {
        if (!condition)
            throw new InvalidOperationException($"Worker self-test failed for {fixture.Name}: {message}");
    }

    private sealed record ModeFixture(int Mode, string Name, int HitObjectCount, int MaxCombo, string Beatmap);

    private const string osuBeatmap = """
        osu file format v14

        [General]
        AudioFilename: audio.mp3
        Mode: 0

        [Metadata]
        Title:Worker self-test osu
        Artist:osubot
        Creator:osubot
        Version:Test
        BeatmapID:0
        BeatmapSetID:-1

        [Difficulty]
        HPDrainRate:5
        CircleSize:4
        OverallDifficulty:8
        ApproachRate:9
        SliderMultiplier:1.4
        SliderTickRate:1

        [TimingPoints]
        0,500,4,2,1,50,1,0

        [HitObjects]
        128,192,1000,1,0,0:0:0:0:
        256,192,1500,2,0,B|384:192,1,140
        384,192,2500,1,0,0:0:0:0:
        """;

    private const string taikoBeatmap = """
        osu file format v14

        [General]
        AudioFilename: audio.mp3
        Mode: 1

        [Metadata]
        Title:Worker self-test taiko
        Artist:osubot
        Creator:osubot
        Version:Test
        BeatmapID:0
        BeatmapSetID:-1

        [Difficulty]
        HPDrainRate:5
        CircleSize:4
        OverallDifficulty:8
        ApproachRate:5
        SliderMultiplier:1.4
        SliderTickRate:1

        [TimingPoints]
        0,500,4,2,1,50,1,0

        [HitObjects]
        256,192,1000,1,0,0:0:0:0:
        256,192,1250,1,2,0:0:0:0:
        256,192,1500,1,0,0:0:0:0:
        256,192,1750,1,2,0:0:0:0:
        256,192,2000,1,0,0:0:0:0:
        256,192,2250,1,2,0:0:0:0:
        """;

    private const string catchBeatmap = """
        osu file format v14

        [General]
        AudioFilename: audio.mp3
        Mode: 2

        [Metadata]
        Title:Worker self-test catch
        Artist:osubot
        Creator:osubot
        Version:Test
        BeatmapID:0
        BeatmapSetID:-1

        [Difficulty]
        HPDrainRate:5
        CircleSize:4
        OverallDifficulty:8
        ApproachRate:7
        SliderMultiplier:1.4
        SliderTickRate:1

        [TimingPoints]
        0,500,4,2,1,50,1,0

        [HitObjects]
        64,192,1000,1,0,0:0:0:0:
        448,192,1250,1,0,0:0:0:0:
        128,192,1500,1,0,0:0:0:0:
        384,192,1750,1,0,0:0:0:0:
        192,192,2000,1,0,0:0:0:0:
        320,192,2250,1,0,0:0:0:0:
        """;

    private const string maniaBeatmap = """
        osu file format v14

        [General]
        AudioFilename: audio.mp3
        Mode: 3

        [Metadata]
        Title:Worker self-test mania
        Artist:osubot
        Creator:osubot
        Version:4K Test
        BeatmapID:0
        BeatmapSetID:-1

        [Difficulty]
        HPDrainRate:5
        CircleSize:4
        OverallDifficulty:8
        ApproachRate:5
        SliderMultiplier:1.4
        SliderTickRate:1

        [TimingPoints]
        0,500,4,2,1,50,1,0

        [HitObjects]
        64,192,1000,1,0,0:0:0:0:
        192,192,1250,1,0,0:0:0:0:
        320,192,1500,128,0,1750:0:0:0:0:
        448,192,1750,1,0,0:0:0:0:
        """;
}
