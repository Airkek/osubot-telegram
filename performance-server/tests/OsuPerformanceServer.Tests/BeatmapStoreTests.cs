using System.Net;
using System.Security.Cryptography;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace OsuPerformanceServer.Tests;

[TestFixture]
public sealed class BeatmapStoreTests
{
    [Test]
    public async Task DownloadsAndDecodesBeatmapsInMemory()
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
            Assert.That(first.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
            Assert.That(second.BeatmapInfo.MD5Hash, Is.EqualTo(hash));
            Assert.That(handler.RequestCount, Is.EqualTo(2));
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
    }

    private static BeatmapStore CreateStore(HttpMessageHandler handler) => new(
        new StaticHttpClientFactory(new HttpClient(handler) { BaseAddress = new Uri("http://beatmaps/") }),
        NullLogger<BeatmapStore>.Instance);

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
