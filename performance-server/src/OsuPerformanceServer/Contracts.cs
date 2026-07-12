namespace OsuPerformanceServer;

internal sealed class ApiModInput
{
    public required string Acronym { get; init; }

    public Dictionary<string, object> Settings { get; init; } = new();
}

internal sealed class ScoreInput
{
    public double Accuracy { get; init; }

    public int? Combo { get; init; }

    public long TotalScore { get; init; }

    public bool Legacy { get; init; }

    public bool Standardised { get; init; }

    public bool Simulate { get; init; }

    public Dictionary<string, int> Statistics { get; init; } = new();
}

internal sealed class BeatmapResult
{
    public required int NativeMode { get; init; }

    public required double StarRating { get; init; }

    public required int MaxCombo { get; init; }

    public required int HitObjectCount { get; init; }

    public required double ApproachRate { get; init; }

    public required double CircleSize { get; init; }

    public required double OverallDifficulty { get; init; }

    public required double DrainRate { get; init; }

    public required double Bpm { get; init; }

    public required double ClockRate { get; init; }
}

internal sealed class PerformanceResult
{
    public required BeatmapResult Difficulty { get; init; }

    public required double Pp { get; init; }

    public required double FcPp { get; init; }

    public required double SsPp { get; init; }
}

internal sealed class ReplayHeaderResult
{
    public required int Mode { get; init; }

    public required int Version { get; init; }

    public required string BeatmapHash { get; init; }
}

internal sealed class ReplayResult
{
    public required int Mode { get; init; }

    public required string BeatmapHash { get; init; }

    public required int BeatmapId { get; init; }

    public required string Player { get; init; }

    public required int PlayerId { get; init; }

    public required Dictionary<string, int> Statistics { get; init; }

    public required long TotalScore { get; init; }

    public long? LegacyTotalScore { get; init; }

    public required int Combo { get; init; }

    public required bool Perfect { get; init; }

    public required double Accuracy { get; init; }

    public required DateTimeOffset Date { get; init; }

    public required ApiModInput[] Mods { get; init; }

    public required bool Legacy { get; init; }

    public required int FrameCount { get; init; }
}
