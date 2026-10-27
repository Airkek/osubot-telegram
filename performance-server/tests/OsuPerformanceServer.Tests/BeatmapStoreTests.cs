using System.Net;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace OsuPerformanceServer.Tests;

[TestFixture]
public sealed class BeatmapStoreTests
{
    private string cachePath = null!;
    private readonly List<IDisposable> resources = new();

    [SetUp]
    public void SetUp() => cachePath = Path.Combine(Path.GetTempPath(), $"osubot-beatmap-cache-{Guid.NewGuid():N}");

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
    public async Task DownloadsOnceAndReusesBeatmapAfterRestart()
    {
        byte[] content = await File.ReadAllBytesAsync(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content);
        var store = CreateStore(handler);

        FileWorkingBeatmap first = await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        handler.FailRequests = true;
        FileWorkingBeatmap second = await CreateStore(handler).GetAsync(1, hash.ToUpperInvariant(), ReadOnlyMemory<byte>.Empty, CancellationToken.None);

        Assert.Multiple(() =>
        {
            Assert.That(first.BeatmapInfo.OnlineID, Is.EqualTo(0));
            Assert.That(second.BeatmapInfo.OnlineID, Is.EqualTo(0));
            Assert.That(first.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
            Assert.That(second.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
            Assert.That(File.ReadAllBytes(Path.Combine(cachePath, $"{hash}.osu")), Is.EqualTo(content));
        });
    }

    [Test]
    public void HashMismatchDoesNotReturnAnotherRevision()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string expected = new('0', 32);
        var store = CreateStore(new CountingHandler(content));

        Assert.That(
            async () => await store.GetAsync(1, expected, ReadOnlyMemory<byte>.Empty, CancellationToken.None),
            Throws.TypeOf<BeatmapHashMismatchException>());
        Assert.That(Directory.GetFiles(cachePath, "*.osu"), Is.Empty);
    }

    [Test]
    public async Task ReusesExistingContentAddressedCache()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content) { FailRequests = true };
        var store = CreateStore(handler);
        await File.WriteAllBytesAsync(Path.Combine(cachePath, $"{hash}.osu"), content);

        FileWorkingBeatmap beatmap = await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        Assert.That(beatmap.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
        Assert.That(handler.RequestCount, Is.Zero);
    }

    [Test]
    public async Task SuppliedContentIsCachedWithoutDownloading()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content) { FailRequests = true };
        var store = CreateStore(handler);
        await store.GetAsync(0, null, content, CancellationToken.None);
        FileWorkingBeatmap cached = await store.GetAsync(0, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        Assert.That(cached.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
        Assert.That(handler.RequestCount, Is.Zero);
    }

    [Test]
    public async Task SuppliedContentCannotBypassHashValidationOnCacheHit()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content);
        var store = CreateStore(handler);
        await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);

        Assert.That(async () => await store.GetAsync(1, hash, StrainStoreTests.ContentForMode(1), CancellationToken.None),
            Throws.TypeOf<BeatmapHashMismatchException>());
        Assert.That(File.ReadAllBytes(Path.Combine(cachePath, $"{hash}.osu")), Is.EqualTo(content));
        Assert.That(handler.RequestCount, Is.EqualTo(1));
    }

    [Test]
    public async Task DamagedCachedBeatmapIsReplaced()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content);
        var store = CreateStore(handler);
        await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        await File.WriteAllTextAsync(Path.Combine(cachePath, $"{hash}.osu"), "damaged cache");

        FileWorkingBeatmap recovered = await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        Assert.That(recovered.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
        Assert.That(handler.RequestCount, Is.EqualTo(2));
        Assert.That(File.ReadAllBytes(Path.Combine(cachePath, $"{hash}.osu")), Is.EqualTo(content));
        Assert.That(Directory.GetFiles(cachePath, "*.tmp"), Is.Empty);
    }

    private BeatmapStore CreateStore(HttpMessageHandler handler)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["BEATMAP_CACHE_PATH"] = cachePath
        }).Build();
        var client = new HttpClient(handler, disposeHandler: false) { BaseAddress = new Uri("http://beatmaps/") };
        resources.Add(client);
        var store = new BeatmapStore(new StaticHttpClientFactory(client), configuration, NullLogger<BeatmapStore>.Instance);
        resources.Add(store);
        return store;
    }

    private static string FixturePath(string fixture) => Path.Combine(
        TestContext.CurrentContext.TestDirectory,
        "fixtures",
        fixture);

    private sealed class StaticHttpClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }

    private sealed class CountingHandler(byte[] content) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }

        public bool FailRequests { get; set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestCount++;
            if (FailRequests)
                throw new HttpRequestException("Beatmap downloads are unavailable");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(content)
            });
        }
    }
}
