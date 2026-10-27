using System.Globalization;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace OsuPerformanceServer;

internal sealed class BeatmapStore
{
    private const int maxBeatmapSize = 50 * 1024 * 1024;
    private static readonly Regex md5Pattern = new("^[a-f0-9]{32}$", RegexOptions.Compiled);

    private readonly IHttpClientFactory httpClientFactory;
    private readonly ILogger<BeatmapStore> logger;

    public BeatmapStore(IHttpClientFactory httpClientFactory, ILogger<BeatmapStore> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.logger = logger;
    }

    public async Task<FileWorkingBeatmap> GetAsync(
        long beatmapId,
        string? expectedMd5,
        ReadOnlyMemory<byte> suppliedContent,
        CancellationToken cancellationToken)
    {
        string expected = NormalizeMd5(expectedMd5);
        byte[] content = suppliedContent.Length > 0
            ? suppliedContent.ToArray()
            : await DownloadAsync(beatmapId, cancellationToken);
        string actual = HashContent(content, beatmapId);
        if (expected.Length > 0 && !string.Equals(expected, actual, StringComparison.Ordinal))
        {
            logger.LogWarning(
                "Beatmap {BeatmapId} hash mismatch: expected {ExpectedHash}, downloaded {ActualHash}",
                beatmapId,
                expected,
                actual);
            throw new BeatmapHashMismatchException(beatmapId, expected, actual);
        }

        cancellationToken.ThrowIfCancellationRequested();
        var beatmap = FileWorkingBeatmap.FromBytes(content);
        beatmap.BeatmapInfo.MD5Hash = actual;
        return beatmap;
    }

    private async Task<byte[]> DownloadAsync(long beatmapId, CancellationToken cancellationToken)
    {
        if (beatmapId <= 0)
            throw new ArgumentOutOfRangeException(nameof(beatmapId), "A positive beatmap id or content is required");

        HttpClient client = httpClientFactory.CreateClient("beatmaps");
        using HttpResponseMessage response = await client.GetAsync(
            beatmapId.ToString(CultureInfo.InvariantCulture),
            HttpCompletionOption.ResponseHeadersRead,
            cancellationToken);
        response.EnsureSuccessStatusCode();
        if (response.Content.Headers.ContentLength is > maxBeatmapSize)
            throw new InvalidDataException($"Beatmap {beatmapId} exceeds the {maxBeatmapSize} byte limit");

        await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var content = new MemoryStream();
        byte[] buffer = new byte[81920];
        int count;
        while ((count = await stream.ReadAsync(buffer, cancellationToken)) > 0)
        {
            if (content.Length + count > maxBeatmapSize)
                throw new InvalidDataException($"Beatmap {beatmapId} exceeds the {maxBeatmapSize} byte limit");
            content.Write(buffer, 0, count);
        }
        return content.ToArray();
    }

    internal static string HashContent(ReadOnlyMemory<byte> content, long beatmapId)
    {
        if (content.Length > maxBeatmapSize)
            throw new InvalidDataException($"Beatmap {beatmapId} exceeds the {maxBeatmapSize} byte limit");
        string header = System.Text.Encoding.UTF8.GetString(content.Span[..Math.Min(content.Length, 64)])
            .TrimStart('\uFEFF');
        if (!header.StartsWith("osu file format v", StringComparison.Ordinal))
            throw new InvalidDataException($"Beatmap {beatmapId} is not a valid .osu file");
        return Convert.ToHexString(MD5.HashData(content.Span)).ToLowerInvariant();
    }

    internal static string NormalizeMd5(string? value)
    {
        string normalized = value?.Trim().ToLowerInvariant() ?? string.Empty;
        if (normalized.Length > 0 && !md5Pattern.IsMatch(normalized))
            throw new ArgumentException("Expected beatmap MD5 must contain 32 hexadecimal characters", nameof(value));
        return normalized;
    }
}

internal sealed class BeatmapHashMismatchException(long beatmapId, string expected, string actual)
    : Exception($"Beatmap {beatmapId} hash mismatch: expected '{expected}', got '{actual}'")
{
    public long BeatmapId { get; } = beatmapId;

    public string Expected { get; } = expected;

    public string Actual { get; } = actual;
}
