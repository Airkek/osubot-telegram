using osu.Game.Beatmaps;
using osu.Game.Database;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Mods;
using osu.Game.Rulesets.Scoring;
using osu.Game.Rulesets.Scoring.Legacy;
using osu.Game.Scoring;
using osu.Game.Scoring.Legacy;
using osu.Game.Utils;

namespace OsuPerformanceWorker;

internal static class CalculatorOperations
{
    public static BeatmapResult CalculateBeatmap(string beatmapPath, int mode, ApiModInput[] modInputs)
        => CalculateBeatmap(new FileWorkingBeatmap(beatmapPath), mode, modInputs);

    internal static BeatmapResult CalculateBeatmap(WorkingBeatmap workingBeatmap, int mode, ApiModInput[] modInputs)
    {
        var ruleset = RulesetHelper.FromLegacyId(mode);
        Mod[] mods = RulesetHelper.ParseMods(ruleset, modInputs);
        var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
        DifficultyAttributes difficulty = ruleset.CreateDifficultyCalculator(workingBeatmap).Calculate(mods);
        return CreateBeatmapResult(workingBeatmap, ruleset, mods, playableBeatmap, difficulty);
    }

    public static PerformanceResult CalculatePerformance(
        string beatmapPath,
        int mode,
        ApiModInput[] modInputs,
        ScoreInput input)
        => CalculatePerformance(new FileWorkingBeatmap(beatmapPath), mode, modInputs, input);

    internal static PerformanceResult CalculatePerformance(
        WorkingBeatmap workingBeatmap,
        int mode,
        ApiModInput[] modInputs,
        ScoreInput input)
    {
        var ruleset = RulesetHelper.FromLegacyId(mode);
        Mod[] mods = RulesetHelper.ParseMods(ruleset, modInputs);
        var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
        DifficultyAttributes difficulty = ruleset.CreateDifficultyCalculator(workingBeatmap).Calculate(mods);
        var maximumStatistics = GetMaximumStatistics(ruleset, playableBeatmap, mods);

        ScoreInfo current = BuildScore(input, workingBeatmap, ruleset, mods, difficulty, maximumStatistics);
        ScoreInfo fc = BuildFullComboScore(current, workingBeatmap, ruleset, mods, difficulty, maximumStatistics);
        ScoreInfo ss = BuildPerfectScore(current, workingBeatmap, ruleset, mods, difficulty, maximumStatistics);

        double pp = CalculatePp(ruleset, current, difficulty);
        double fcPp = CalculatePp(ruleset, fc, difficulty);
        double ssPp = CalculatePp(ruleset, ss, difficulty);

        return new PerformanceResult
        {
            Difficulty = CreateBeatmapResult(workingBeatmap, ruleset, mods, playableBeatmap, difficulty),
            Pp = pp,
            FcPp = fcPp,
            SsPp = ssPp
        };
    }

    private static BeatmapResult CreateBeatmapResult(
        WorkingBeatmap workingBeatmap,
        Ruleset ruleset,
        Mod[] mods,
        IBeatmap playableBeatmap,
        DifficultyAttributes difficulty)
    {
        var displayDifficulty = ruleset.GetAdjustedDisplayDifficulty(workingBeatmap.BeatmapInfo, mods);
        double clockRate = ModUtils.CalculateRateWithMods(mods);

        return new BeatmapResult
        {
            NativeMode = workingBeatmap.BeatmapInfo.Ruleset.OnlineID,
            StarRating = difficulty.StarRating,
            MaxCombo = difficulty.MaxCombo,
            HitObjectCount = playableBeatmap.HitObjects.Count,
            ApproachRate = displayDifficulty.ApproachRate,
            CircleSize = displayDifficulty.CircleSize,
            OverallDifficulty = displayDifficulty.OverallDifficulty,
            DrainRate = displayDifficulty.DrainRate,
            Bpm = 60_000 / playableBeatmap.GetMostCommonBeatLength() * clockRate,
            ClockRate = clockRate
        };
    }

    internal static ScoreInfo BuildScore(
        ScoreInput input,
        WorkingBeatmap workingBeatmap,
        Ruleset ruleset,
        Mod[] mods,
        DifficultyAttributes difficulty,
        Dictionary<HitResult, int> maximumStatistics)
    {
        Dictionary<HitResult, int> statistics = input.Simulate
            ? SimulateStatistics(input, ruleset, mods, maximumStatistics)
            : Statistics.FromWire(input.Statistics);
        bool requiresLegacyMigration = input.Legacy && !input.Standardised;
        if (requiresLegacyMigration && ruleset.RulesetInfo.OnlineID != 2)
            statistics = statistics
                .Where(pair => pair.Key.IsBasic())
                .ToDictionary(pair => pair.Key, pair => pair.Value);
        double accuracy = input.Simulate
            ? CalculateSimulatedAccuracy(ruleset.RulesetInfo.OnlineID, statistics, maximumStatistics, mods)
            : input.Accuracy;
        // The legacy decoder treats non-empty maximum statistics as authoritative. It must derive
        // LegacyComboIncrease itself for stable scores, which only contain basic hit counts.
        var scoreMaximumStatistics = requiresLegacyMigration
            ? new Dictionary<HitResult, int>()
            : new Dictionary<HitResult, int>(maximumStatistics);

        var score = new ScoreInfo(workingBeatmap.BeatmapInfo, ruleset.RulesetInfo)
        {
            Accuracy = accuracy,
            MaxCombo = input.Combo ?? difficulty.MaxCombo,
            Statistics = statistics,
            MaximumStatistics = scoreMaximumStatistics,
            TotalScore = input.TotalScore,
            LegacyTotalScore = input.Legacy ? input.TotalScore : null,
            IsLegacyScore = input.Legacy,
            Mods = mods
        };

        if (requiresLegacyMigration)
        {
            var playableBeatmap = workingBeatmap.GetPlayableBeatmap(ruleset.RulesetInfo, mods);
            LegacyScoreDecoder.PopulateMaximumStatistics(score, workingBeatmap);
            StandardisedScoreMigrationTools.UpdateFromLegacy(
                score,
                ruleset,
                LegacyBeatmapConversionDifficultyInfo.FromBeatmap(playableBeatmap),
                ((ILegacyRuleset)ruleset).CreateLegacyScoreSimulator().Simulate(workingBeatmap, playableBeatmap));
        }

        return score;
    }

    internal static ScoreInfo BuildFullComboScore(
        ScoreInfo current,
        WorkingBeatmap workingBeatmap,
        Ruleset ruleset,
        Mod[] mods,
        DifficultyAttributes difficulty,
        Dictionary<HitResult, int> maximumStatistics)
    {
        var statistics = new Dictionary<HitResult, int>(current.Statistics);
        var scoreProcessor = ruleset.CreateScoreProcessor();
        HitResult topResult = ruleset.GetHitResultsForDisplay()
            .Select(result => result.result)
            .Where(result => result.IsBasic())
            .MaxBy(scoreProcessor.GetBaseScoreForResult);

        int totalBasicResults = maximumStatistics.Where(pair => pair.Key.IsBasic()).Sum(pair => pair.Value);
        statistics[HitResult.Miss] = 0;
        foreach (HitResult result in statistics.Keys.Where(result => result.IsBasic()).ToArray())
            statistics[result] = Math.Max(0, statistics[result]);
        int lowerResults = statistics
            .Where(pair => pair.Key.IsBasic() && pair.Key != HitResult.Miss && pair.Key != topResult)
            .Sum(pair => Math.Max(0, pair.Value));
        statistics[topResult] = Math.Max(0, totalBasicResults - lowerResults);

        if (current.IsLegacyScore)
        {
            if (ruleset.RulesetInfo.OnlineID != 2)
                statistics = statistics
                    .Where(pair => pair.Key.IsBasic())
                    .ToDictionary(pair => pair.Key, pair => pair.Value);
            var legacyFullCombo = new ScoreInfo(workingBeatmap.BeatmapInfo, ruleset.RulesetInfo)
            {
                MaxCombo = difficulty.MaxCombo,
                Statistics = statistics,
                MaximumStatistics = new Dictionary<HitResult, int>(),
                TotalScore = 0,
                LegacyTotalScore = null,
                IsLegacyScore = true,
                Mods = mods
            };
            LegacyScoreDecoder.PopulateMaximumStatistics(legacyFullCombo, workingBeatmap);
            legacyFullCombo.Accuracy = CalculateAccuracy(
                legacyFullCombo.Statistics,
                legacyFullCombo.MaximumStatistics,
                scoreProcessor);
            return legacyFullCombo;
        }

        FillNestedHits(statistics, maximumStatistics, HitResult.SmallTickMiss, HitResult.SmallTickHit);
        FillNestedHits(statistics, maximumStatistics, HitResult.LargeTickMiss, HitResult.LargeTickHit);
        if (maximumStatistics.TryGetValue(HitResult.SliderTailHit, out int sliderTails))
            statistics[HitResult.SliderTailHit] = sliderTails;

        return new ScoreInfo(workingBeatmap.BeatmapInfo, ruleset.RulesetInfo)
        {
            Accuracy = CalculateAccuracy(statistics, maximumStatistics, scoreProcessor),
            MaxCombo = difficulty.MaxCombo,
            Statistics = statistics,
            MaximumStatistics = new Dictionary<HitResult, int>(maximumStatistics),
            TotalScore = 0,
            LegacyTotalScore = null,
            IsLegacyScore = false,
            Mods = mods
        };
    }

    internal static ScoreInfo BuildPerfectScore(
        ScoreInfo current,
        WorkingBeatmap workingBeatmap,
        Ruleset ruleset,
        Mod[] mods,
        DifficultyAttributes difficulty,
        Dictionary<HitResult, int> maximumStatistics)
    {
        if (current.IsLegacyScore)
        {
            Dictionary<HitResult, int> statistics;
            if (ruleset.RulesetInfo.OnlineID == 2)
            {
                statistics = new Dictionary<HitResult, int>(maximumStatistics);
            }
            else
            {
                var scoreProcessor = ruleset.CreateScoreProcessor();
                HitResult topResult = ruleset.GetHitResultsForDisplay()
                    .Select(result => result.result)
                    .Where(result => result.IsBasic())
                    .MaxBy(scoreProcessor.GetBaseScoreForResult);
                int totalBasicResults = maximumStatistics.Where(pair => pair.Key.IsBasic()).Sum(pair => pair.Value);
                statistics = new Dictionary<HitResult, int> { [topResult] = totalBasicResults };
            }

            var legacyPerfect = new ScoreInfo(workingBeatmap.BeatmapInfo, ruleset.RulesetInfo)
            {
                Accuracy = 1,
                MaxCombo = difficulty.MaxCombo,
                Statistics = statistics,
                MaximumStatistics = new Dictionary<HitResult, int>(),
                TotalScore = 0,
                LegacyTotalScore = null,
                IsLegacyScore = true,
                Mods = mods
            };
            LegacyScoreDecoder.PopulateMaximumStatistics(legacyPerfect, workingBeatmap);
            return legacyPerfect;
        }

        return new ScoreInfo(workingBeatmap.BeatmapInfo, ruleset.RulesetInfo)
        {
            Accuracy = 1,
            MaxCombo = difficulty.MaxCombo,
            Statistics = new Dictionary<HitResult, int>(maximumStatistics),
            MaximumStatistics = new Dictionary<HitResult, int>(maximumStatistics),
            TotalScore = 1_000_000,
            IsLegacyScore = false,
            Mods = mods
        };
    }

    internal static Dictionary<HitResult, int> GetMaximumStatistics(Ruleset ruleset, IBeatmap beatmap, Mod[] mods)
    {
        var processor = ruleset.CreateScoreProcessor();
        processor.Mods.Value = mods;
        processor.ApplyBeatmap(beatmap);
        return processor.MaximumStatistics;
    }

    private static Dictionary<HitResult, int> SimulateStatistics(
        ScoreInput input,
        Ruleset ruleset,
        Mod[] mods,
        Dictionary<HitResult, int> maximumStatistics)
    {
        int misses = input.Statistics.GetValueOrDefault("miss");
        return ruleset.RulesetInfo.OnlineID switch
        {
            0 => SimulateOsu(input.Accuracy, misses, maximumStatistics),
            1 => SimulateTaiko(input.Accuracy, misses, maximumStatistics),
            2 => SimulateCatch(input.Accuracy, misses, maximumStatistics),
            3 => SimulateMania(input.Accuracy, misses, mods, maximumStatistics),
            _ => throw new ArgumentOutOfRangeException(nameof(ruleset))
        };
    }

    private static Dictionary<HitResult, int> SimulateOsu(
        double accuracy,
        int countMiss,
        IReadOnlyDictionary<HitResult, int> maximumStatistics)
    {
        int totalResultCount = maximumStatistics.GetValueOrDefault(HitResult.Great);
        int relevantResultCount = totalResultCount - countMiss;
        double relevantAccuracy = relevantResultCount > 0
            ? Math.Clamp(accuracy * totalResultCount / relevantResultCount, 0, 1)
            : 0;
        int countOk;
        int countMeh;

        if (relevantAccuracy >= 0.25)
        {
            double ratioMehToOk = Math.Pow(1 - (relevantAccuracy - 0.25) / 0.75, 2);
            double countOkEstimate = 6 * relevantResultCount * (1 - relevantAccuracy) / (5 * ratioMehToOk + 4);
            double countMehEstimate = countOkEstimate * ratioMehToOk;
            countOk = (int)Math.Round(countOkEstimate);
            countMeh = (int)Math.Round(countOkEstimate + countMehEstimate) - countOk;
        }
        else if (relevantAccuracy >= 1.0 / 6)
        {
            double countOkEstimate = 6 * relevantResultCount * relevantAccuracy - relevantResultCount;
            countOk = (int)Math.Round(countOkEstimate);
            countMeh = relevantResultCount - countOk;
        }
        else
        {
            countOk = 0;
            countMeh = (int)Math.Round(6 * relevantResultCount * relevantAccuracy);
            countMiss = totalResultCount - countMeh;
        }

        var result = new Dictionary<HitResult, int>
        {
            [HitResult.Great] = totalResultCount - countOk - countMeh - countMiss,
            [HitResult.Ok] = countOk,
            [HitResult.Meh] = countMeh,
            [HitResult.Miss] = countMiss,
            [HitResult.LargeTickMiss] = 0
        };
        if (maximumStatistics.TryGetValue(HitResult.SliderTailHit, out int sliderTails))
            result[HitResult.SliderTailHit] = sliderTails;
        return result;
    }

    private static Dictionary<HitResult, int> SimulateTaiko(
        double accuracy,
        int countMiss,
        IReadOnlyDictionary<HitResult, int> maximumStatistics)
    {
        int total = maximumStatistics.GetValueOrDefault(HitResult.Great);
        int target = (int)Math.Round(accuracy * total * 2);
        int great = target - (total - countMiss);
        int ok = total - great - countMiss;
        return new Dictionary<HitResult, int>
        {
            [HitResult.Great] = great,
            [HitResult.Ok] = ok,
            [HitResult.Meh] = 0,
            [HitResult.Miss] = countMiss
        };
    }

    private static Dictionary<HitResult, int> SimulateCatch(
        double accuracy,
        int countMiss,
        IReadOnlyDictionary<HitResult, int> maximumStatistics)
    {
        int maxFruits = maximumStatistics.GetValueOrDefault(HitResult.Great);
        int maxDroplets = maximumStatistics.GetValueOrDefault(HitResult.LargeTickHit);
        int maxTinyDroplets = maximumStatistics.GetValueOrDefault(HitResult.SmallTickHit);
        int countDroplets = maxDroplets;
        int countFruits = maxFruits - countMiss;
        int countTinyDroplets = (int)Math.Round(accuracy * (maxFruits + maxDroplets + maxTinyDroplets))
                                - countFruits
                                - countDroplets;
        return new Dictionary<HitResult, int>
        {
            [HitResult.Great] = countFruits,
            [HitResult.LargeTickHit] = countDroplets,
            [HitResult.SmallTickHit] = countTinyDroplets,
            [HitResult.SmallTickMiss] = maxTinyDroplets - countTinyDroplets,
            [HitResult.Miss] = countMiss
        };
    }

    private static Dictionary<HitResult, int> SimulateMania(
        double accuracy,
        int countMiss,
        Mod[] mods,
        IReadOnlyDictionary<HitResult, int> maximumStatistics)
    {
        int total = maximumStatistics.Where(pair => pair.Key.IsBasic()).Sum(pair => pair.Value);
        int perfectValue = mods.Any(mod => mod is ModClassic) ? 60 : 61;
        int targetTotal = (int)Math.Round(accuracy * total * perfectValue);
        int remaining = total - countMiss;
        int delta = Math.Max(targetTotal - 10 * remaining, 0);
        int perfect = Math.Min(delta / (perfectValue - 10), remaining);
        delta -= perfect * (perfectValue - 10);
        remaining -= perfect;
        int great = Math.Min(delta / 50, remaining);
        delta -= great * 50;
        remaining -= great;
        int good = Math.Min(delta / 30, remaining);
        delta -= good * 30;
        remaining -= good;
        int ok = Math.Min(delta / 10, remaining);
        remaining -= ok;

        return new Dictionary<HitResult, int>
        {
            [HitResult.Perfect] = perfect,
            [HitResult.Great] = great,
            [HitResult.Good] = good,
            [HitResult.Ok] = ok,
            [HitResult.Meh] = remaining,
            [HitResult.Miss] = countMiss
        };
    }

    private static double CalculateSimulatedAccuracy(
        int mode,
        IReadOnlyDictionary<HitResult, int> statistics,
        IReadOnlyDictionary<HitResult, int> maximumStatistics,
        Mod[] mods)
    {
        switch (mode)
        {
            case 0:
                {
                    int great = statistics.GetValueOrDefault(HitResult.Great);
                    int ok = statistics.GetValueOrDefault(HitResult.Ok);
                    int meh = statistics.GetValueOrDefault(HitResult.Meh);
                    int miss = statistics.GetValueOrDefault(HitResult.Miss);
                    double achieved = 6 * great + 2 * ok + meh;
                    double maximum = 6 * (great + ok + meh + miss);
                    if (statistics.TryGetValue(HitResult.SliderTailHit, out int tails))
                    {
                        achieved += 3 * tails;
                        maximum += 3 * maximumStatistics.GetValueOrDefault(HitResult.SliderTailHit);
                    }
                    if (statistics.TryGetValue(HitResult.LargeTickMiss, out int tickMisses))
                    {
                        int maximumTicks = maximumStatistics.GetValueOrDefault(HitResult.LargeTickHit);
                        achieved += 0.6 * (maximumTicks - tickMisses);
                        maximum += 0.6 * maximumTicks;
                    }
                    return maximum > 0 ? achieved / maximum : 1;
                }

            case 1:
                {
                    int great = statistics.GetValueOrDefault(HitResult.Great);
                    int ok = statistics.GetValueOrDefault(HitResult.Ok);
                    int miss = statistics.GetValueOrDefault(HitResult.Miss);
                    int total = great + ok + miss;
                    return total > 0 ? (2.0 * great + ok) / (2 * total) : 1;
                }

            case 2:
                {
                    int hits = statistics.GetValueOrDefault(HitResult.Great)
                               + statistics.GetValueOrDefault(HitResult.LargeTickHit)
                               + statistics.GetValueOrDefault(HitResult.SmallTickHit);
                    int total = hits
                                + statistics.GetValueOrDefault(HitResult.Miss)
                                + statistics.GetValueOrDefault(HitResult.LargeTickMiss)
                                + statistics.GetValueOrDefault(HitResult.SmallTickMiss);
                    return total > 0 ? (double)hits / total : 1;
                }

            case 3:
                {
                    int perfect = statistics.GetValueOrDefault(HitResult.Perfect);
                    int great = statistics.GetValueOrDefault(HitResult.Great);
                    int good = statistics.GetValueOrDefault(HitResult.Good);
                    int ok = statistics.GetValueOrDefault(HitResult.Ok);
                    int meh = statistics.GetValueOrDefault(HitResult.Meh);
                    int miss = statistics.GetValueOrDefault(HitResult.Miss);
                    int perfectWeight = mods.Any(mod => mod is ModClassic) ? 300 : 305;
                    double achieved = perfectWeight * perfect + 300 * great + 200 * good + 100 * ok + 50 * meh;
                    double maximum = perfectWeight * (perfect + great + good + ok + meh + miss);
                    return maximum > 0 ? achieved / maximum : 1;
                }

            default:
                throw new ArgumentOutOfRangeException(nameof(mode));
        }
    }

    private static void FillNestedHits(
        Dictionary<HitResult, int> statistics,
        IReadOnlyDictionary<HitResult, int> maximumStatistics,
        HitResult missResult,
        HitResult hitResult)
    {
        statistics[missResult] = 0;
        if (maximumStatistics.TryGetValue(hitResult, out int maximum))
            statistics[hitResult] = maximum;
    }

    private static double CalculateAccuracy(
        IReadOnlyDictionary<HitResult, int> statistics,
        IReadOnlyDictionary<HitResult, int> maximumStatistics,
        ScoreProcessor processor)
    {
        double achieved = statistics
            .Where(pair => pair.Key.AffectsAccuracy())
            .Sum(pair => (double)processor.GetBaseScoreForResult(pair.Key) * pair.Value);
        double maximum = maximumStatistics
            .Where(pair => pair.Key.AffectsAccuracy())
            .Sum(pair => (double)processor.GetBaseScoreForResult(pair.Key) * pair.Value);
        return maximum > 0 ? Math.Clamp(achieved / maximum, 0, 1) : 1;
    }

    private static double CalculatePp(Ruleset ruleset, ScoreInfo score, DifficultyAttributes difficulty) =>
        ruleset.CreatePerformanceCalculator()?.Calculate(score, difficulty).Total ?? 0;
}
