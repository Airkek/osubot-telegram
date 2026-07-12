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

    [SetUp]
    public void SetUp() => cachePath = Path.Combine(Path.GetTempPath(), $"osubot-beatmap-cache-{Guid.NewGuid():N}");

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(cachePath))
            Directory.Delete(cachePath, true);
    }

    [Test]
    public async Task DownloadsOnceAndReusesContentAddressedCache()
    {
        byte[] content = await File.ReadAllBytesAsync(FixturePath("official-calculator.osu"));
        string hash = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        var handler = new CountingHandler(content);
        var store = CreateStore(handler);

        FileWorkingBeatmap first = await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);
        FileWorkingBeatmap second = await store.GetAsync(1, hash, ReadOnlyMemory<byte>.Empty, CancellationToken.None);

        Assert.Multiple(() =>
        {
            Assert.That(first.BeatmapInfo.OnlineID, Is.EqualTo(0));
            Assert.That(second.BeatmapInfo.OnlineID, Is.EqualTo(0));
            Assert.That(handler.RequestCount, Is.EqualTo(1));
            Assert.That(File.Exists(Path.Combine(cachePath, $"{hash}.osu")), Is.True);
        });
    }

    [Test]
    public void HashMismatchStoresActualRevisionButDoesNotReturnIt()
    {
        byte[] content = File.ReadAllBytes(FixturePath("official-calculator.osu"));
        string actual = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
        string expected = new('0', 32);
        var store = CreateStore(new CountingHandler(content));

        Assert.That(
            async () => await store.GetAsync(1, expected, ReadOnlyMemory<byte>.Empty, CancellationToken.None),
            Throws.TypeOf<BeatmapHashMismatchException>());
        Assert.Multiple(() =>
        {
            Assert.That(File.Exists(Path.Combine(cachePath, $"{actual}.osu")), Is.True);
            Assert.That(File.Exists(Path.Combine(cachePath, $"{expected}.osu")), Is.False);
        });
    }

    private BeatmapStore CreateStore(HttpMessageHandler handler)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["BEATMAP_CACHE_PATH"] = cachePath })
            .Build();
        return new BeatmapStore(
            new StaticHttpClientFactory(new HttpClient(handler) { BaseAddress = new Uri("http://beatmaps/") }),
            configuration,
            NullLogger<BeatmapStore>.Instance);
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

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestCount++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(content)
            });
        }
    }
}
