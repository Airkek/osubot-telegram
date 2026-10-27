using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using osu.Game.Online.API;
using osu.Game.Rulesets.Mods;

namespace OsuPerformanceServer;

internal sealed class StrainStore(BeatmapStore beatmaps, StrainCache cache) : IDisposable
{
    private readonly SemaphoreSlim[] gates = Enumerable.Range(0, 64).Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    public async Task<BeatmapCalculation> GetAsync(
        long beatmapId,
        string? expectedMd5,
        ReadOnlyMemory<byte> suppliedContent,
        int mode,
        ApiModInput[] modInputs,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var ruleset = RulesetHelper.FromLegacyId(mode);
        Mod[] mods = RulesetHelper.ParseMods(ruleset, modInputs);
        if (mods.OfType<IHasSeed>().Any(mod => mod.Seed.Value == null))
        {
            FileWorkingBeatmap uncached = await beatmaps.GetAsync(beatmapId, expectedMd5, suppliedContent, cancellationToken);
            return CalculatorOperations.PrepareBeatmap(uncached, ruleset, mods, cancellationToken);
        }
        string modKey = CreateModKey(mods);
        string hash = BeatmapStore.NormalizeMd5(expectedMd5);
        if (suppliedContent.Length > 0)
        {
            string actual = BeatmapStore.HashContent(suppliedContent, beatmapId);
            if (hash.Length > 0 && hash != actual)
                throw new BeatmapHashMismatchException(beatmapId, hash, actual);
            hash = actual;
        }

        if (hash.Length > 0 && await cache.GetAsync(hash, mode, modKey, cancellationToken) is { } cached)
            return cached;

        string lockKey = $"{(hash.Length > 0 ? hash : $"id:{beatmapId}")}:{mode}:{modKey}";
        SemaphoreSlim gate = gates[(uint)StringComparer.Ordinal.GetHashCode(lockKey) % gates.Length];
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (hash.Length > 0 && await cache.GetAsync(hash, mode, modKey, cancellationToken) is { } existing)
                return existing;

            FileWorkingBeatmap beatmap = await beatmaps.GetAsync(beatmapId, hash, suppliedContent, cancellationToken);
            hash = beatmap.BeatmapInfo.MD5Hash;
            if (await cache.GetAsync(hash, mode, modKey, cancellationToken) is { } downloaded)
                return downloaded;

            BeatmapCalculation calculation = CalculatorOperations.PrepareBeatmap(beatmap, ruleset, mods, cancellationToken);
            await cache.StoreAsync(hash, mode, modKey, calculation, cancellationToken);
            return calculation;
        }
        finally
        {
            gate.Release();
        }
    }

    public void Dispose()
    {
        foreach (SemaphoreSlim gate in gates)
            gate.Dispose();
    }

    internal static string CreateModKey(IEnumerable<Mod> mods) => new JArray(
        mods.Select(mod =>
        {
            var api = new APIMod(mod);
            return new JObject
            {
                ["acronym"] = api.Acronym,
                ["settings"] = Canonicalize(JToken.FromObject(api.Settings))
            };
        }).OrderBy(mod => (string)mod["acronym"]!, StringComparer.Ordinal)).ToString(Formatting.None);

    private static JToken Canonicalize(JToken token) => token switch
    {
        JObject obj => new JObject(obj.Properties().OrderBy(property => property.Name, StringComparer.Ordinal)
            .Select(property => new JProperty(property.Name, Canonicalize(property.Value)))),
        JArray array => new JArray(array.Select(Canonicalize)),
        _ => token.DeepClone()
    };
}
