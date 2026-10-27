using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;
using osu.Game.Rulesets.Difficulty;

namespace OsuPerformanceServer.Tests;

[TestFixture]
[NonParallelizable]
public sealed class StrainStoreTests
{
    private string cachePath = null!;
    private readonly List<IDisposable> resources = new();

    [SetUp]
    public void SetUp() => cachePath = Path.Combine(Path.GetTempPath(), $"osubot-strain-cache-{Guid.NewGuid():N}");

    [TearDown]
    public void TearDown()
    {
        foreach (IDisposable resource in resources.AsEnumerable().Reverse())
            resource.Dispose();
        resources.Clear();
        if (Directory.Exists(cachePath))
            Directory.Delete(cachePath, true);
    }

    [Test]
    public async Task CachedStrainsSurviveRestartAndAvoidBeatmapAccess()
    {
        byte[] content = ContentForMode(0);
        string hash = Hash(content);
        var handler = new CountingHandler(content);
        BeatmapCalculation first = await GetAsync(CreateStore(handler), hash);
        string beatmapPath = Path.Combine(cachePath, "beatmaps", $"{hash}.osu");
        Assert.That(File.Exists(beatmapPath), Is.True);
        File.Delete(beatmapPath);
        handler.FailRequests = true;
        BeatmapCalculation cached = await GetAsync(CreateStore(handler), hash.ToUpperInvariant());

        Assert.Multiple(() =>
        {
            Assert.That(cached.Difficulty.StarRating, Is.EqualTo(first.Difficulty.StarRating));
            Assert.That(cached.Difficulty.MaxCombo, Is.EqualTo(first.Difficulty.MaxCombo));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
            Assert.That(Directory.GetFiles(cachePath, "*.osu", SearchOption.AllDirectories), Is.Empty);
            Assert.That(Scalar("SELECT COUNT(*) FROM strains WHERE valid = 1"), Is.EqualTo(1));
        });
    }

    [TestCase(0, 0, false)]
    [TestCase(1, 1, false)]
    [TestCase(2, 2, false)]
    [TestCase(3, 3, false)]
    [TestCase(0, 1, false)]
    [TestCase(0, 2, false)]
    [TestCase(0, 3, false)]
    [TestCase(0, 0, true)]
    [TestCase(1, 1, true)]
    [TestCase(2, 2, true)]
    [TestCase(3, 3, true)]
    [TestCase(0, 1, true)]
    [TestCase(0, 2, true)]
    [TestCase(0, 3, true)]
    public async Task PersistedStrainsPreserveDifficultyAndPerformance(int sourceMode, int mode, bool legacy)
    {
        byte[] content = ContentForMode(sourceMode);
        string hash = Hash(content);
        var handler = new CountingHandler(content);
        ApiModInput[] mods = legacy
            ? [new ApiModInput { Acronym = "CL" }]
            : [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = 1.2 } }];
        var input = new ScoreInput
        {
            Accuracy = sourceMode == 1 ? 0.5 : 0.9,
            TotalScore = 600_000,
            Legacy = legacy,
            Standardised = !legacy,
            Simulate = true,
            Statistics = new() { ["miss"] = 1 }
        };
        BeatmapCalculation first = await GetAsync(CreateStore(handler), hash, mode, mods);
        handler.FailRequests = true;
        BeatmapCalculation cached = await GetAsync(CreateStore(handler), hash, mode, mods);
        PerformanceResult expected = CalculatorOperations.CalculatePerformance(FileWorkingBeatmap.FromBytes(content), mode, mods, input);
        PerformanceResult actual = CalculatorOperations.CalculatePerformance(cached, mods, input);

        Assert.Multiple(() =>
        {
            Assert.That(cached.Beatmap.NativeMode, Is.EqualTo(sourceMode));
            Assert.That(cached.BaseDifficulty, Is.EqualTo(first.BaseDifficulty));
            Assert.That(cached.LegacyConversion, Is.EqualTo(first.LegacyConversion));
            Assert.That(cached.LegacyScore, Is.EqualTo(first.LegacyScore));
            Assert.That(cached.MaximumStatistics, Is.EquivalentTo(first.MaximumStatistics));
            Assert.That(actual.Pp, Is.EqualTo(expected.Pp).Within(1e-10));
            Assert.That(actual.FcPp, Is.EqualTo(expected.FcPp).Within(1e-10));
            Assert.That(actual.SsPp, Is.EqualTo(expected.SsPp).Within(1e-10));
            foreach (var property in first.Difficulty.GetType().GetProperties()
                         .Where(property => property.Name != nameof(DifficultyAttributes.Mods)))
                Assert.That(property.GetValue(cached.Difficulty), Is.EqualTo(property.GetValue(first.Difficulty)), property.Name);
            Assert.That(handler.RequestCount, Is.EqualTo(1));
        });
    }

    [Test]
    public async Task DifferentScoresReuseStrainsButRecalculatePp()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        BeatmapCalculation calculation = await GetAsync(store, Hash(content));
        PerformanceResult first = CalculatorOperations.CalculatePerformance(calculation, [],
            new ScoreInput { Accuracy = 1, Simulate = true });
        BeatmapCalculation cached = await GetAsync(store, Hash(content));
        PerformanceResult second = CalculatorOperations.CalculatePerformance(cached, [],
            new ScoreInput { Accuracy = 0.5, Simulate = true, Statistics = new() { ["miss"] = 1 } });

        Assert.Multiple(() =>
        {
            Assert.That(first.Pp, Is.GreaterThan(second.Pp));
            Assert.That(first.SsPp, Is.EqualTo(second.SsPp));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
        });
    }

    [Test]
    public async Task CanonicalModOrderAndSettingsShareAnEntry()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        ApiModInput speed = new() { Acronym = "DT", Settings = new() { ["speed_change"] = 1.2 } };
        ApiModInput firstAdjust = new() { Acronym = "DA", Settings = new() { ["circle_size"] = 6.5, ["approach_rate"] = 8.3 } };
        ApiModInput secondAdjust = new() { Acronym = "DA", Settings = new() { ["approach_rate"] = 8.3, ["circle_size"] = 6.5 } };
        BeatmapCalculation first = await GetAsync(store, Hash(content), mods: [speed, firstAdjust]);
        BeatmapCalculation second = await GetAsync(store, Hash(content), mods: [secondAdjust, speed]);

        Assert.Multiple(() =>
        {
            Assert.That(second.Beatmap.CircleSize, Is.EqualTo(6.5));
            Assert.That(second.Beatmap.ApproachRate, Is.EqualTo(first.Beatmap.ApproachRate));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
            Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(1));
        });
    }

    [Test]
    public async Task DifferentModesAndModSettingsHaveSeparateEntries()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        BeatmapCalculation baseline = await GetAsync(store, Hash(content));
        BeatmapCalculation taiko = await GetAsync(store, Hash(content), mode: 1);
        BeatmapCalculation slow = await GetAsync(store, Hash(content), mods:
            [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = 1.1 } }]);
        BeatmapCalculation fast = await GetAsync(store, Hash(content), mods:
            [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = 1.4 } }]);
        BeatmapCalculation adjusted = await GetAsync(store, Hash(content), mods:
            [new ApiModInput { Acronym = "DA", Settings = new() { ["circle_size"] = 6.5 } }]);

        Assert.Multiple(() =>
        {
            Assert.That(taiko.Mode, Is.EqualTo(1));
            Assert.That(fast.Beatmap.ClockRate, Is.GreaterThan(slow.Beatmap.ClockRate));
            Assert.That(adjusted.Beatmap.CircleSize, Is.Not.EqualTo(baseline.Beatmap.CircleSize));
            Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(5));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
        });
    }

    [Test]
    public async Task ConcurrentMissesDownloadAndCalculateOnce()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        BeatmapCalculation[] calculations = await Task.WhenAll(Enumerable.Range(0, 16)
            .Select(_ => GetAsync(store, Hash(content))));

        Assert.Multiple(() =>
        {
            Assert.That(calculations, Has.Length.EqualTo(16));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
            Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(1));
        });
    }

    [Test]
    public async Task DifferentDtRatesReuseBeatmapAfterRestart()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore first = CreateStore(handler);
        await GetAsync(first, Hash(content), mods:
            [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = 1.11 } }]);

        handler.FailRequests = true;
        StrainStore restarted = CreateStore(handler);
        for (int i = 12; i <= 20; i++)
        {
            double rate = 1 + i / 100.0;
            BeatmapCalculation calculation = await GetAsync(restarted, Hash(content), mods:
                [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = rate } }]);
            Assert.That(calculation.Beatmap.ClockRate, Is.EqualTo(rate).Within(1e-12));
        }

        Assert.That(handler.RequestCount, Is.EqualTo(1));
        Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(10));
        Assert.That(Directory.GetFiles(Path.Combine(cachePath, "beatmaps"), "*.osu"), Has.Length.EqualTo(1));
    }

    [Test]
    public async Task ConcurrentDifferentDtRatesDownloadOneBeatmap()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        BeatmapCalculation[] calculations = await Task.WhenAll(Enumerable.Range(11, 16)
            .Select(i => GetAsync(store, Hash(content), mods:
                [new ApiModInput { Acronym = "DT", Settings = new() { ["speed_change"] = 1 + i / 100.0 } }])));

        Assert.That(calculations, Has.Length.EqualTo(16));
        Assert.That(handler.RequestCount, Is.EqualTo(1));
        Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(16));
        Assert.That(Directory.GetFiles(Path.Combine(cachePath, "beatmaps"), "*.osu"), Has.Length.EqualTo(1));
    }

    [Test]
    public async Task RandomWithoutSeedIsNotPersisted()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        ApiModInput[] mods = [new ApiModInput { Acronym = "RD" }];
        await GetAsync(store, Hash(content), mods: mods);
        await GetAsync(store, Hash(content), mods: mods);
        Assert.That(handler.RequestCount, Is.EqualTo(1));
        Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.Zero);
    }

    [Test]
    public async Task RandomSeedsHaveSeparateReusableEntries()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        ApiModInput[] firstMods = [new ApiModInput { Acronym = "RD", Settings = new() { ["seed"] = 12345 } }];
        ApiModInput[] secondMods = [new ApiModInput { Acronym = "RD", Settings = new() { ["seed"] = 54321 } }];
        BeatmapCalculation first = await GetAsync(store, Hash(content), mods: firstMods);
        await GetAsync(store, Hash(content), mods: secondMods);
        BeatmapCalculation cached = await GetAsync(store, Hash(content), mods: firstMods);
        Assert.That(cached.Beatmap.StarRating, Is.EqualTo(first.Beatmap.StarRating));
        Assert.That(handler.RequestCount, Is.EqualTo(1));
        Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(2));
    }

    [TestCase(0)]
    [TestCase(1)]
    [TestCase(2)]
    [TestCase(3)]
    public async Task DifficultyVersionChangeInvalidatesOnlyAffectedRuleset(int affectedMode)
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore old = CreateStore(handler);
        for (int mode = 0; mode < 4; mode++)
            await GetAsync(old, Hash(content), mode);
        await GetAsync(old, Hash(content), affectedMode, [new ApiModInput { Acronym = "DT" }]);
        Execute($"UPDATE strains SET version = '1:0' WHERE mode = {affectedMode}");
        StrainStore updated = CreateStore(handler);
        Assert.That(Scalar("SELECT COUNT(*) FROM strains WHERE valid = 0"), Is.EqualTo(2));
        Assert.That(Scalar("SELECT COUNT(*) FROM strains WHERE valid = 1"), Is.EqualTo(3));

        handler.FailRequests = true;
        for (int mode = 0; mode < 4; mode++)
        {
            if (mode != affectedMode)
                await GetAsync(updated, Hash(content), mode);
        }
        Assert.That(handler.RequestCount, Is.EqualTo(1));

        await GetAsync(updated, Hash(content), affectedMode);
        Assert.Multiple(() =>
        {
            Assert.That(Scalar("SELECT COUNT(*) FROM strains WHERE valid = 1"), Is.EqualTo(4));
            Assert.That(Scalar("SELECT COUNT(*) FROM strains WHERE valid = 0"), Is.EqualTo(1));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
        });
    }

    [Test]
    public async Task PreviousCacheVersionIsInvalidatedOnStartup()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        await GetAsync(CreateStore(handler), Hash(content));
        Execute("UPDATE strains SET version = '2026.702.1:1:1'");
        StrainStore updated = CreateStore(handler);
        Assert.That(Scalar("SELECT valid FROM strains"), Is.Zero);
        handler.FailRequests = true;
        await GetAsync(updated, Hash(content));
        Assert.That(handler.RequestCount, Is.EqualTo(1));
    }

    [Test]
    public async Task InvalidFlagPreventsReuseAtTheCurrentVersion()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        await GetAsync(store, Hash(content));
        Execute("UPDATE strains SET valid = 0");
        handler.FailRequests = true;
        await GetAsync(store, Hash(content));
        Assert.That(handler.RequestCount, Is.EqualTo(1));
        Assert.That(Scalar("SELECT valid FROM strains"), Is.EqualTo(1));
    }

    [Test]
    public async Task UnreadablePayloadIsInvalidatedAndRecalculated()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        BeatmapCalculation first = await GetAsync(store, Hash(content));
        Execute("UPDATE strains SET payload = '{}'");
        File.Delete(Path.Combine(cachePath, "beatmaps", $"{Hash(content)}.osu"));
        handler.FailRequests = true;
        Assert.That(async () => await GetAsync(store, Hash(content)), Throws.TypeOf<HttpRequestException>());
        Assert.That(Scalar("SELECT valid FROM strains"), Is.Zero);

        handler.FailRequests = false;
        BeatmapCalculation rebuilt = await GetAsync(store, Hash(content));
        Assert.That(rebuilt.Beatmap.StarRating, Is.EqualTo(first.Beatmap.StarRating));
        Assert.That(Scalar("SELECT valid FROM strains"), Is.EqualTo(1));
    }

    [Test]
    public async Task SuppliedContentCanPopulateCacheWithoutAnIdOrDownload()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content) { FailRequests = true };
        StrainStore store = CreateStore(handler);
        BeatmapCalculation first = await store.GetAsync(0, null, content, 0, [], CancellationToken.None);
        BeatmapCalculation cached = await store.GetAsync(0, Hash(content), ReadOnlyMemory<byte>.Empty, 0, [], CancellationToken.None);

        Assert.Multiple(() =>
        {
            Assert.That(cached.Beatmap.StarRating, Is.EqualTo(first.Beatmap.StarRating));
            Assert.That(handler.RequestCount, Is.Zero);
        });
    }

    [Test]
    public async Task SuppliedContentIsValidatedEvenOnACacheHit()
    {
        byte[] content = ContentForMode(0);
        var handler = new CountingHandler(content);
        StrainStore store = CreateStore(handler);
        await GetAsync(store, Hash(content));

        Assert.That(async () => await store.GetAsync(1, Hash(content), ContentForMode(1), 0, [], CancellationToken.None),
            Throws.TypeOf<BeatmapHashMismatchException>());
        Assert.That(async () => await store.GetAsync(1, Hash(content), Encoding.UTF8.GetBytes("<html>not a map</html>"), 0, [], CancellationToken.None),
            Throws.TypeOf<InvalidDataException>());
        Assert.That(handler.RequestCount, Is.EqualTo(1));
    }

    [Test]
    public void HashMismatchCannotPopulateStrainCache()
    {
        var handler = new CountingHandler(ContentForMode(0));
        StrainStore store = CreateStore(handler);
        Assert.That(async () => await GetAsync(store, new string('0', 32)), Throws.TypeOf<BeatmapHashMismatchException>());
        Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.Zero);
    }

    [Test]
    public async Task RequestsWithoutHashRefreshTheBeatmapRevision()
    {
        var handler = new CountingHandler(ContentForMode(0));
        StrainStore store = CreateStore(handler);
        await GetAsync(store, "");
        handler.Content = Encoding.UTF8.GetBytes(Encoding.UTF8.GetString(handler.Content).Replace("CircleSize:4", "CircleSize:6"));
        BeatmapCalculation updated = await GetAsync(store, "");

        Assert.Multiple(() =>
        {
            Assert.That(updated.Beatmap.CircleSize, Is.EqualTo(6));
            Assert.That(handler.RequestCount, Is.EqualTo(2));
            Assert.That(Scalar("SELECT COUNT(*) FROM strains"), Is.EqualTo(2));
        });
    }

    private StrainStore CreateStore(CountingHandler handler)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["STRAIN_CACHE_PATH"] = cachePath,
            ["BEATMAP_CACHE_PATH"] = Path.Combine(cachePath, "beatmaps")
        }).Build();
        var cache = new StrainCache(configuration, NullLogger<StrainCache>.Instance);
        resources.Add(cache);
        var client = new HttpClient(handler, disposeHandler: false) { BaseAddress = new Uri("http://beatmaps/") };
        resources.Add(client);
        var beatmaps = new BeatmapStore(new StaticHttpClientFactory(client), configuration, NullLogger<BeatmapStore>.Instance);
        resources.Add(beatmaps);
        var store = new StrainStore(beatmaps, cache);
        resources.Add(store);
        return store;
    }

    private static Task<BeatmapCalculation> GetAsync(StrainStore store, string hash, int mode = 0, ApiModInput[]? mods = null) =>
        store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, mode, mods ?? [], CancellationToken.None);

    private long Scalar(string sql)
    {
        using var connection = OpenDatabase();
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        return Convert.ToInt64(command.ExecuteScalar());
    }

    private void Execute(string sql)
    {
        using var connection = OpenDatabase();
        using var command = connection.CreateCommand();
        command.CommandText = sql;
        command.ExecuteNonQuery();
    }

    private SqliteConnection OpenDatabase()
    {
        var connection = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = Path.Combine(cachePath, "strains.db"),
            Pooling = false
        }.ToString());
        connection.Open();
        return connection;
    }

    private static string Hash(byte[] content) => Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();

    internal static byte[] ContentForMode(int mode)
    {
        string fixture = mode == 3 ? "official-calculator-mania.osu" : "official-calculator.osu";
        string content = File.ReadAllText(Path.Combine(TestContext.CurrentContext.TestDirectory, "fixtures", fixture));
        return Encoding.UTF8.GetBytes(content.Replace("Mode: 0", $"Mode: {mode}"));
    }

    private sealed class StaticHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class CountingHandler(byte[] content) : HttpMessageHandler
    {
        private int requestCount;

        public int RequestCount => requestCount;

        public byte[] Content { get; set; } = content;

        public bool FailRequests { get; set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Interlocked.Increment(ref requestCount);
            await Task.Yield();
            cancellationToken.ThrowIfCancellationRequested();
            if (FailRequests)
                throw new HttpRequestException("Beatmap downloads are unavailable");
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(Content) };
        }
    }
}
