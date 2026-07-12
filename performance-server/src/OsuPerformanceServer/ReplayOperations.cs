using osu.Game.Beatmaps;
using osu.Game.IO.Legacy;
using osu.Game.Online.API;
using osu.Game.Rulesets;
using osu.Game.Rulesets.Scoring;
using osu.Game.Scoring;
using osu.Game.Scoring.Legacy;

namespace OsuPerformanceServer;

internal static class ReplayOperations
{
    public static ReplayHeaderResult ReadHeader(ReadOnlyMemory<byte> replay)
    {
        using var stream = new MemoryStream(replay.ToArray(), false);
        return ReadHeader(stream);
    }

    private static ReplayHeaderResult ReadHeader(Stream stream)
    {
        using var reader = new SerializationReader(stream);
        int mode = reader.ReadByte();
        int version = reader.ReadInt32();
        string beatmapHash = reader.ReadString();

        return new ReplayHeaderResult
        {
            Mode = mode,
            Version = version,
            BeatmapHash = beatmapHash
        };
    }

    public static ReplayResult Decode(ReadOnlyMemory<byte> replay, WorkingBeatmap workingBeatmap)
    {
        var header = ReadHeader(replay);
        var decoder = new FileScoreDecoder(workingBeatmap);

        Score score;
        using (var stream = new MemoryStream(replay.ToArray(), false))
            score = decoder.Parse(stream);

        ScoreInfo info = score.ScoreInfo;
        var ruleset = info.Ruleset.CreateInstance();
        int maximumCombo = ruleset.CreateDifficultyCalculator(workingBeatmap).Calculate(info.Mods).MaxCombo;

        return new ReplayResult
        {
            Mode = info.Ruleset.OnlineID,
            BeatmapHash = header.BeatmapHash,
            BeatmapId = workingBeatmap.BeatmapInfo.OnlineID,
            Player = info.User.Username,
            PlayerId = info.UserID,
            Statistics = Statistics.ToWire(info.Statistics),
            TotalScore = info.TotalScore,
            LegacyTotalScore = info.LegacyTotalScore,
            Combo = info.MaxCombo,
            Perfect = info.MaxCombo >= maximumCombo,
            Accuracy = info.Accuracy,
            Date = info.Date,
            Mods = info.Mods.Select(mod =>
            {
                var apiMod = new APIMod(mod);
                return new ApiModInput
                {
                    Acronym = apiMod.Acronym,
                    Settings = apiMod.Settings
                };
            }).ToArray(),
            Legacy = info.IsLegacyScore,
            FrameCount = score.Replay.Frames.Count
        };
    }

    private sealed class FileScoreDecoder(WorkingBeatmap beatmap) : LegacyScoreDecoder
    {
        protected override Ruleset GetRuleset(int rulesetId) => RulesetHelper.FromLegacyId(rulesetId);

        protected override WorkingBeatmap GetBeatmap(string md5Hash) => beatmap;
    }
}

internal static class Statistics
{
#pragma warning disable CS0618 // Required to preserve legacy score statistics emitted by osu!.
    private static readonly IReadOnlyDictionary<string, HitResult> fromWire = new Dictionary<string, HitResult>
    {
        ["miss"] = HitResult.Miss,
        ["meh"] = HitResult.Meh,
        ["ok"] = HitResult.Ok,
        ["good"] = HitResult.Good,
        ["great"] = HitResult.Great,
        ["perfect"] = HitResult.Perfect,
        ["small_tick_miss"] = HitResult.SmallTickMiss,
        ["small_tick_hit"] = HitResult.SmallTickHit,
        ["large_tick_miss"] = HitResult.LargeTickMiss,
        ["large_tick_hit"] = HitResult.LargeTickHit,
        ["slider_tail_hit"] = HitResult.SliderTailHit,
        ["legacy_combo_increase"] = HitResult.LegacyComboIncrease
    };
#pragma warning restore CS0618

    public static Dictionary<HitResult, int> FromWire(IReadOnlyDictionary<string, int> source)
    {
        var result = new Dictionary<HitResult, int>();
        foreach ((string name, int count) in source)
        {
            if (!fromWire.TryGetValue(name, out HitResult hitResult))
                throw new ArgumentException($"Unsupported hit result '{name}'");
            result[hitResult] = count;
        }
        return result;
    }

    public static Dictionary<string, int> ToWire(IReadOnlyDictionary<HitResult, int> source)
    {
        var result = new Dictionary<string, int>();
        foreach ((HitResult hitResult, int count) in source)
        {
            string? name = fromWire.FirstOrDefault(pair => pair.Value == hitResult).Key;
            if (name != null)
                result[name] = count;
        }
        return result;
    }
}
