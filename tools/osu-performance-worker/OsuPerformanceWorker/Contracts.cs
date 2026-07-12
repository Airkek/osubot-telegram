using Newtonsoft.Json;

namespace OsuPerformanceWorker;

internal sealed class WorkerRequest
{
    [JsonProperty("id")]
    public required string Id { get; init; }

    [JsonProperty("operation")]
    public required string Operation { get; init; }

    [JsonProperty("beatmap_path")]
    public string? BeatmapPath { get; init; }

    [JsonProperty("replay_path")]
    public string? ReplayPath { get; init; }

    [JsonProperty("mode")]
    public int Mode { get; init; }

    [JsonProperty("mods")]
    public ApiModInput[] Mods { get; init; } = [];

    [JsonProperty("score")]
    public ScoreInput? Score { get; init; }
}

internal sealed class ApiModInput
{
    [JsonProperty("acronym")]
    public required string Acronym { get; init; }

    [JsonProperty("settings")]
    public Dictionary<string, object> Settings { get; init; } = new();
}

internal sealed class ScoreInput
{
    [JsonProperty("accuracy")]
    public double Accuracy { get; init; }

    [JsonProperty("combo")]
    public int? Combo { get; init; }

    [JsonProperty("total_score")]
    public long TotalScore { get; init; }

    [JsonProperty("legacy")]
    public bool Legacy { get; init; }

    [JsonProperty("standardised")]
    public bool Standardised { get; init; }

    [JsonProperty("simulate")]
    public bool Simulate { get; init; }

    [JsonProperty("statistics")]
    public Dictionary<string, int> Statistics { get; init; } = new();
}

internal sealed class WorkerResponse
{
    [JsonProperty("id")]
    public required string Id { get; init; }

    [JsonProperty("result", NullValueHandling = NullValueHandling.Ignore)]
    public object? Result { get; init; }

    [JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
    public WorkerError? Error { get; init; }
}

internal sealed class WorkerError
{
    [JsonProperty("type")]
    public required string Type { get; init; }

    [JsonProperty("message")]
    public required string Message { get; init; }
}

internal sealed class BeatmapResult
{
    [JsonProperty("native_mode")]
    public required int NativeMode { get; init; }

    [JsonProperty("star_rating")]
    public required double StarRating { get; init; }

    [JsonProperty("max_combo")]
    public required int MaxCombo { get; init; }

    [JsonProperty("hit_object_count")]
    public required int HitObjectCount { get; init; }

    [JsonProperty("approach_rate")]
    public required double ApproachRate { get; init; }

    [JsonProperty("circle_size")]
    public required double CircleSize { get; init; }

    [JsonProperty("overall_difficulty")]
    public required double OverallDifficulty { get; init; }

    [JsonProperty("drain_rate")]
    public required double DrainRate { get; init; }

    [JsonProperty("bpm")]
    public required double Bpm { get; init; }

    [JsonProperty("clock_rate")]
    public required double ClockRate { get; init; }
}

internal sealed class PerformanceResult
{
    [JsonProperty("difficulty")]
    public required BeatmapResult Difficulty { get; init; }

    [JsonProperty("pp")]
    public required double Pp { get; init; }

    [JsonProperty("fc_pp")]
    public required double FcPp { get; init; }

    [JsonProperty("ss_pp")]
    public required double SsPp { get; init; }
}

internal sealed class ReplayHeaderResult
{
    [JsonProperty("mode")]
    public required int Mode { get; init; }

    [JsonProperty("version")]
    public required int Version { get; init; }

    [JsonProperty("beatmap_hash")]
    public required string BeatmapHash { get; init; }
}

internal sealed class ReplayResult
{
    [JsonProperty("mode")]
    public required int Mode { get; init; }

    [JsonProperty("beatmap_hash")]
    public required string BeatmapHash { get; init; }

    [JsonProperty("beatmap_id")]
    public required int BeatmapId { get; init; }

    [JsonProperty("player")]
    public required string Player { get; init; }

    [JsonProperty("player_id")]
    public required int PlayerId { get; init; }

    [JsonProperty("statistics")]
    public required Dictionary<string, int> Statistics { get; init; }

    [JsonProperty("total_score")]
    public required long TotalScore { get; init; }

    [JsonProperty("legacy_total_score")]
    public long? LegacyTotalScore { get; init; }

    [JsonProperty("combo")]
    public required int Combo { get; init; }

    [JsonProperty("perfect")]
    public required bool Perfect { get; init; }

    [JsonProperty("accuracy")]
    public required double Accuracy { get; init; }

    [JsonProperty("date")]
    public required DateTimeOffset Date { get; init; }

    [JsonProperty("mods")]
    public required object[] Mods { get; init; }

    [JsonProperty("legacy")]
    public required bool Legacy { get; init; }

    [JsonProperty("frame_count")]
    public required int FrameCount { get; init; }
}
