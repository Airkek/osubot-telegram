using NUnit.Framework;
using osu.Game.Beatmaps;
using osu.Game.Beatmaps.Formats;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Scoring;
using osu.Game.Scoring;

namespace OsuPerformanceServer.Tests;

[TestFixture]
[NonParallelizable]
public sealed class CalculatorOperationsTests
{
    [Test]
    public void LazerDifficultyAppliesClockRateAndDifficultyAdjust()
    {
        BeatmapResult result = CalculatorOperations.CalculateBeatmap(
            BeatmapPath,
            0,
            [
                new ApiModInput
                {
                    Acronym = "HD",
                    Settings = new Dictionary<string, object> { ["only_fade_approach_circles"] = true }
                },
                new ApiModInput
                {
                    Acronym = "DT",
                    Settings = new Dictionary<string, object> { ["speed_change"] = 1.35 }
                },
                new ApiModInput
                {
                    Acronym = "DA",
                    Settings = new Dictionary<string, object>
                    {
                        ["circle_size"] = 6.5,
                        ["approach_rate"] = 9.3,
                        ["overall_difficulty"] = 8.7,
                        ["drain_rate"] = 4.2
                    }
                }
            ]);

        Assert.Multiple(() =>
        {
            Assert.That(result.MaxCombo, Is.EqualTo(4));
            Assert.That(Math.Round(result.CircleSize, 2), Is.EqualTo(6.5));
            Assert.That(Math.Round(result.ApproachRate, 2), Is.EqualTo(10.26));
            Assert.That(Math.Round(result.OverallDifficulty, 2), Is.EqualTo(9.9));
            Assert.That(Math.Round(result.DrainRate, 2), Is.EqualTo(4.2));
            Assert.That(Math.Round(result.ClockRate, 2), Is.EqualTo(1.35));
        });
    }

    [Test]
    public void DifficultyAdjustAppliesAllSettings()
    {
        BeatmapResult result = CalculatorOperations.CalculateBeatmap(
            BeatmapPath,
            0,
            [
                new ApiModInput
                {
                    Acronym = "DA",
                    Settings = new Dictionary<string, object>
                    {
                        ["circle_size"] = 5,
                        ["approach_rate"] = 5,
                        ["overall_difficulty"] = 5,
                        ["drain_rate"] = 5
                    }
                }
            ]);

        Assert.Multiple(() =>
        {
            Assert.That(result.CircleSize, Is.EqualTo(5));
            Assert.That(result.ApproachRate, Is.EqualTo(5));
            Assert.That(result.OverallDifficulty, Is.EqualTo(5));
            Assert.That(result.DrainRate, Is.EqualTo(5));
        });
    }

    [Test]
    public void DifficultyAdjustPartialOverridePreservesOtherSettings()
    {
        BeatmapResult baseline = CalculatorOperations.CalculateBeatmap(BeatmapPath, 0, []);
        BeatmapResult adjusted = CalculatorOperations.CalculateBeatmap(
            BeatmapPath,
            0,
            [
                new ApiModInput
                {
                    Acronym = "DA",
                    Settings = new Dictionary<string, object> { ["circle_size"] = 6.5 }
                }
            ]);

        Assert.Multiple(() =>
        {
            Assert.That(adjusted.CircleSize, Is.EqualTo(6.5));
            Assert.That(adjusted.ApproachRate, Is.EqualTo(baseline.ApproachRate));
            Assert.That(adjusted.OverallDifficulty, Is.EqualTo(baseline.OverallDifficulty));
            Assert.That(adjusted.DrainRate, Is.EqualTo(baseline.DrainRate));
        });
    }

    [Test]
    public void DifficultyAdjustClampsValuesToExtendedLimits()
    {
        BeatmapResult result = CalculatorOperations.CalculateBeatmap(
            BeatmapPath,
            0,
            [
                new ApiModInput
                {
                    Acronym = "DA",
                    Settings = new Dictionary<string, object>
                    {
                        ["circle_size"] = 50,
                        ["approach_rate"] = -50,
                        ["overall_difficulty"] = 50,
                        ["drain_rate"] = -50,
                        ["extended_limits"] = true
                    }
                }
            ]);

        Assert.Multiple(() =>
        {
            Assert.That(result.CircleSize, Is.EqualTo(11));
            Assert.That(result.ApproachRate, Is.EqualTo(-10));
            Assert.That(result.OverallDifficulty, Is.EqualTo(11));
            Assert.That(result.DrainRate, Is.EqualTo(0));
        });
    }

    [Test]
    public void LazerOnlyModCombinationIsAccepted()
    {
        BeatmapResult result = CalculatorOperations.CalculateBeatmap(
            BeatmapPath,
            0,
            [
                new ApiModInput { Acronym = "HD" },
                new ApiModInput { Acronym = "DT" },
                new ApiModInput { Acronym = "TC" }
            ]);

        Assert.That(result.StarRating, Is.GreaterThan(0));
    }

    [Test]
    public void LegacyMigrationDerivesLegacyMaximumStatistics()
    {
        CalculatorContext context = CreateContext();
        ScoreInfo score = CalculatorOperations.BuildScore(
            CreateLegacyInput(combo: 2),
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);

        Assert.Multiple(() =>
        {
            Assert.That(score.IsLegacyScore, Is.True);
            Assert.That(score.Accuracy, Is.EqualTo(14.0 / 18).Within(1e-12));
            Assert.That(score.MaximumStatistics[HitResult.Great], Is.EqualTo(3));
#pragma warning disable CS0618
            Assert.That(score.MaximumStatistics[HitResult.LegacyComboIncrease], Is.EqualTo(1));
#pragma warning restore CS0618
            Assert.That(score.MaximumStatistics.ContainsKey(HitResult.LargeTickHit), Is.False);
            Assert.That(score.MaximumStatistics.ContainsKey(HitResult.SmallTickHit), Is.False);
            Assert.That(score.Statistics.ContainsKey(HitResult.LargeTickHit), Is.False);
            Assert.That(score.Statistics.ContainsKey(HitResult.SliderTailHit), Is.False);
        });
    }

    [Test]
    public void LegacyFullComboAndPerfectScoresStayLegacyShaped()
    {
        CalculatorContext context = CreateContext();
        ScoreInfo current = CalculatorOperations.BuildScore(
            CreateLegacyInput(combo: 4),
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);
        ScoreInfo fullCombo = CalculatorOperations.BuildFullComboScore(
            current,
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);
        ScoreInfo perfect = CalculatorOperations.BuildPerfectScore(
            current,
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);

        Assert.Multiple(() =>
        {
            AssertLegacyShape(fullCombo);
            Assert.That(fullCombo.Accuracy, Is.EqualTo(current.Accuracy).Within(1e-12));
            Assert.That(fullCombo.LegacyTotalScore, Is.Null);

            AssertLegacyShape(perfect);
            Assert.That(perfect.Accuracy, Is.EqualTo(1));
            Assert.That(perfect.Statistics[HitResult.Great], Is.EqualTo(3));
            Assert.That(perfect.LegacyTotalScore, Is.Null);
        });
    }

    [Test]
    public void LegacySliderBreakRemainsBelowFullComboPerformance()
    {
        PerformanceResult result = CalculatorOperations.CalculatePerformance(
            BeatmapPath,
            0,
            [new ApiModInput { Acronym = "CL" }],
            CreateLegacyInput(combo: 2));

        Assert.Multiple(() =>
        {
            Assert.That(result.Pp, Is.GreaterThan(0));
            Assert.That(result.Pp, Is.LessThan(result.FcPp));
            Assert.That(result.FcPp, Is.LessThan(result.SsPp));
        });
    }

    [Test]
    public void LegacyManiaFullComboKeepsClassicAccuracy()
    {
        CalculatorContext context = CreateContext(3, "official-calculator-mania.osu");
        int totalBasicResults = context.MaximumStatistics.Where(pair => pair.Key.IsBasic()).Sum(pair => pair.Value);
        var input = new ScoreInput
        {
            Accuracy = 1,
            Combo = context.Difficulty.MaxCombo,
            TotalScore = 600_000,
            Legacy = true,
            Standardised = false,
            Simulate = false,
            Statistics = new Dictionary<string, int>
            {
                ["perfect"] = 1,
                ["great"] = totalBasicResults - 3,
                ["good"] = 1,
                ["ok"] = 1
            }
        };
        ScoreInfo current = CalculatorOperations.BuildScore(
            input,
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);
        ScoreInfo fullCombo = CalculatorOperations.BuildFullComboScore(
            current,
            context.Beatmap,
            context.Ruleset,
            context.Mods,
            context.Difficulty,
            context.MaximumStatistics);

        Assert.Multiple(() =>
        {
            Assert.That(fullCombo.Accuracy, Is.EqualTo(current.Accuracy).Within(1e-12));
            Assert.That(fullCombo.IsLegacyScore, Is.True);
        });
    }

    private static void AssertLegacyShape(ScoreInfo score)
    {
        Assert.That(score.IsLegacyScore, Is.True);
        Assert.That(score.Statistics.ContainsKey(HitResult.LargeTickHit), Is.False);
        Assert.That(score.Statistics.ContainsKey(HitResult.SmallTickHit), Is.False);
        Assert.That(score.Statistics.ContainsKey(HitResult.SliderTailHit), Is.False);
        Assert.That(score.MaximumStatistics.ContainsKey(HitResult.LargeTickHit), Is.False);
        Assert.That(score.MaximumStatistics.ContainsKey(HitResult.SmallTickHit), Is.False);
#pragma warning disable CS0618
        Assert.That(score.MaximumStatistics[HitResult.LegacyComboIncrease], Is.EqualTo(1));
#pragma warning restore CS0618
    }

    private static ScoreInput CreateLegacyInput(int combo) => new()
    {
        Accuracy = 14.0 / 18,
        Combo = combo,
        TotalScore = 600_000,
        Legacy = true,
        Standardised = false,
        Simulate = false,
        Statistics = new Dictionary<string, int>
        {
            ["great"] = 2,
            ["ok"] = 1,
            ["large_tick_hit"] = 0,
            ["large_tick_miss"] = 0,
            ["small_tick_miss"] = 0,
            ["slider_tail_hit"] = 0
        }
    };

    private static CalculatorContext CreateContext(int mode = 0, string fixture = "official-calculator.osu")
    {
        var beatmap = new FileWorkingBeatmap(FixturePath(fixture));
        Ruleset ruleset = RulesetHelper.FromLegacyId(mode);
        Mod[] mods = RulesetHelper.ParseMods(ruleset, [new ApiModInput { Acronym = "CL" }]);
        IBeatmap playableBeatmap = beatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
        DifficultyAttributes difficulty = ruleset.CreateDifficultyCalculator(beatmap).Calculate(mods);
        Dictionary<HitResult, int> maximumStatistics =
            CalculatorOperations.GetMaximumStatistics(ruleset, playableBeatmap, mods);
        return new CalculatorContext(beatmap, ruleset, mods, difficulty, maximumStatistics);
    }

    private static string BeatmapPath => FixturePath("official-calculator.osu");

    private static string FixturePath(string fixture) => Path.Combine(
        TestContext.CurrentContext.TestDirectory,
        "fixtures",
        fixture);

    private sealed record CalculatorContext(
        FileWorkingBeatmap Beatmap,
        Ruleset Ruleset,
        Mod[] Mods,
        DifficultyAttributes Difficulty,
        Dictionary<HitResult, int> MaximumStatistics);
}
