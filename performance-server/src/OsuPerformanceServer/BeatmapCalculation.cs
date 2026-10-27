using osu.Game.Beatmaps;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Scoring;
using osu.Game.Rulesets.Scoring.Legacy;

namespace OsuPerformanceServer;

internal sealed class BeatmapCalculation
{
    public required int Mode { get; init; }

    public required BeatmapResult Beatmap { get; init; }

    public required DifficultyAttributes Difficulty { get; init; }

    public required DifficultySettings BaseDifficulty { get; init; }

    public required LegacyConversionData LegacyConversion { get; init; }

    public required LegacyScoreAttributes LegacyScore { get; init; }

    public required Dictionary<HitResult, int> MaximumStatistics { get; init; }

    public BeatmapInfo CreateBeatmapInfo() => new(
        RulesetHelper.FromLegacyId(Beatmap.NativeMode).RulesetInfo,
        new BeatmapDifficulty(BaseDifficulty));
}

internal sealed record DifficultySettings(
    float DrainRate,
    float CircleSize,
    float OverallDifficulty,
    float ApproachRate,
    double SliderMultiplier,
    double SliderTickRate) : IBeatmapDifficultyInfo
{
    public static DifficultySettings From(IBeatmapDifficultyInfo difficulty) => new(
        difficulty.DrainRate,
        difficulty.CircleSize,
        difficulty.OverallDifficulty,
        difficulty.ApproachRate,
        difficulty.SliderMultiplier,
        difficulty.SliderTickRate);
}

internal sealed record LegacyConversionData(
    int SourceMode,
    DifficultySettings Difficulty,
    int EndTimeObjectCount,
    int TotalObjectCount)
{
    public static LegacyConversionData From(LegacyBeatmapConversionDifficultyInfo difficulty) => new(
        difficulty.SourceRuleset.OnlineID,
        DifficultySettings.From(difficulty),
        difficulty.EndTimeObjectCount,
        difficulty.TotalObjectCount);

    public LegacyBeatmapConversionDifficultyInfo ToDifficulty() => new()
    {
        SourceRuleset = RulesetHelper.FromLegacyId(SourceMode).RulesetInfo,
        DrainRate = Difficulty.DrainRate,
        CircleSize = Difficulty.CircleSize,
        OverallDifficulty = Difficulty.OverallDifficulty,
        ApproachRate = Difficulty.ApproachRate,
        EndTimeObjectCount = EndTimeObjectCount,
        TotalObjectCount = TotalObjectCount
    };
}
