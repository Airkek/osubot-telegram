using osu.Framework.Audio.Track;
using osu.Framework.Graphics.Textures;
using osu.Game.Beatmaps;
using osu.Game.Beatmaps.Formats;
using osu.Game.IO;
using osu.Game.Skinning;

namespace OsuPerformanceWorker;

internal sealed class FileWorkingBeatmap : WorkingBeatmap
{
    private readonly Beatmap beatmap;

    public FileWorkingBeatmap(string file)
        : this(ReadFromFile(file))
    {
    }

    private FileWorkingBeatmap(Beatmap beatmap)
        : base(beatmap.BeatmapInfo, null)
    {
        this.beatmap = beatmap;
        beatmap.BeatmapInfo.Ruleset = RulesetHelper.FromLegacyId(beatmap.BeatmapInfo.Ruleset.OnlineID).RulesetInfo;
    }

    private static Beatmap ReadFromFile(string filename)
    {
        using var stream = File.OpenRead(filename);
        using var reader = new LineBufferedReader(stream);
        return Decoder.GetDecoder<Beatmap>(reader).Decode(reader);
    }

    protected override IBeatmap GetBeatmap() => beatmap;

    public override Texture GetBackground() => throw new NotSupportedException();

    protected override Track GetBeatmapTrack() => throw new NotSupportedException();

    protected override ISkin GetSkin() => throw new NotSupportedException();

    public override Stream GetStream(string storagePath) => throw new NotSupportedException();
}
