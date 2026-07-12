using System.Globalization;
using Google.Protobuf.Collections;
using Newtonsoft.Json;
using Contract = OsuPerformanceServer.Grpc.V1;

namespace OsuPerformanceServer;

internal static class GrpcMapper
{
    public static ApiModInput[] ToDomain(RepeatedField<Contract.Mod> mods) => mods
        .Select(mod => new ApiModInput
        {
            Acronym = mod.Acronym,
            Settings = string.IsNullOrWhiteSpace(mod.SettingsJson)
                ? new Dictionary<string, object>()
                : JsonConvert.DeserializeObject<Dictionary<string, object>>(mod.SettingsJson)
                  ?? new Dictionary<string, object>()
        })
        .ToArray();

    public static ScoreInput ToDomain(Contract.ScoreInput score) => new()
    {
        Accuracy = score.Accuracy,
        Combo = score.HasCombo ? score.Combo : null,
        TotalScore = score.TotalScore,
        Legacy = score.Legacy,
        Standardised = score.Standardised,
        Simulate = score.Simulate,
        Statistics = score.Statistics.ToDictionary()
    };

    public static Contract.BeatmapAttributes ToContract(BeatmapResult result) => new()
    {
        NativeMode = result.NativeMode,
        StarRating = result.StarRating,
        MaxCombo = result.MaxCombo,
        HitObjectCount = result.HitObjectCount,
        ApproachRate = result.ApproachRate,
        CircleSize = result.CircleSize,
        OverallDifficulty = result.OverallDifficulty,
        DrainRate = result.DrainRate,
        Bpm = result.Bpm,
        ClockRate = result.ClockRate
    };

    public static Contract.PerformanceAttributes ToContract(PerformanceResult result) => new()
    {
        Difficulty = ToContract(result.Difficulty),
        Pp = result.Pp,
        FcPp = result.FcPp,
        SsPp = result.SsPp
    };

    public static Contract.ReplayHeader ToContract(ReplayHeaderResult result) => new()
    {
        Mode = result.Mode,
        Version = result.Version,
        BeatmapHash = result.BeatmapHash
    };

    public static Contract.Replay ToContract(ReplayResult result)
    {
        var replay = new Contract.Replay
        {
            Mode = result.Mode,
            BeatmapHash = result.BeatmapHash,
            BeatmapId = result.BeatmapId,
            Player = result.Player,
            PlayerId = result.PlayerId,
            TotalScore = result.TotalScore,
            Combo = result.Combo,
            Perfect = result.Perfect,
            Accuracy = result.Accuracy,
            Date = result.Date.ToString("O", CultureInfo.InvariantCulture),
            Legacy = result.Legacy,
            FrameCount = result.FrameCount
        };
        if (result.LegacyTotalScore.HasValue)
            replay.LegacyTotalScore = result.LegacyTotalScore.Value;
        replay.Statistics.Add(result.Statistics);
        replay.Mods.Add(result.Mods.Select(ToContract));
        return replay;
    }

    private static Contract.Mod ToContract(ApiModInput mod) => new()
    {
        Acronym = mod.Acronym,
        SettingsJson = JsonConvert.SerializeObject(mod.Settings)
    };
}
