using System.Collections.Concurrent;
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
    private readonly string cachePath;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> locks = new(StringComparer.Ordinal);

    public BeatmapStore(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<BeatmapStore> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.logger = logger;
        cachePath = Path.GetFullPath(
            configuration["BEATMAP_CACHE_PATH"]
            ?? Path.Combine(AppContext.BaseDirectory, "beatmap-cache"));
        Directory.CreateDirectory(cachePath);
    }

    public async Task<FileWorkingBeatmap> GetAsync(
        long beatmapId,
        string? expectedMd5,
        ReadOnlyMemory<byte> suppliedContent,
        CancellationToken cancellationToken)
    {
        string expected = NormalizeMd5(expectedMd5);
        if (expected.Length > 0)
        {
            string cachedPath = PathForHash(expected);
            if (File.Exists(cachedPath))
                return new FileWorkingBeatmap(cachedPath);
        }

        string lockKey = expected.Length > 0 ? expected : $"id:{beatmapId}";
        SemaphoreSlim gate = locks.GetOrAdd(lockKey, static _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (expected.Length > 0)
            {
                string cachedPath = PathForHash(expected);
                if (File.Exists(cachedPath))
                    return new FileWorkingBeatmap(cachedPath);
            }

            byte[] content = suppliedContent.Length > 0
                ? suppliedContent.ToArray()
                : await DownloadAsync(beatmapId, cancellationToken);
            ValidateContent(content, beatmapId);

            string actual = Convert.ToHexString(MD5.HashData(content)).ToLowerInvariant();
            string actualPath = PathForHash(actual);
            await StoreAsync(actualPath, content, cancellationToken);

            if (expected.Length > 0 && !string.Equals(expected, actual, StringComparison.Ordinal))
            {
                logger.LogWarning(
                    "Beatmap {BeatmapId} hash mismatch: expected {ExpectedHash}, downloaded {ActualHash}",
                    beatmapId,
                    expected,
                    actual);
                throw new BeatmapHashMismatchException(beatmapId, expected, actual);
            }

            return new FileWorkingBeatmap(actualPath);
        }
        finally
        {
            gate.Release();
        }
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

        byte[] content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        if (content.Length > maxBeatmapSize)
            throw new InvalidDataException($"Beatmap {beatmapId} exceeds the {maxBeatmapSize} byte limit");
        return content;
    }

    private static void ValidateContent(byte[] content, long beatmapId)
    {
        string header = System.Text.Encoding.UTF8.GetString(content.AsSpan(0, Math.Min(content.Length, 64)))
            .TrimStart('\uFEFF');
        if (!header.StartsWith("osu file format v", StringComparison.Ordinal))
            throw new InvalidDataException($"Beatmap {beatmapId} is not a valid .osu file");
    }

    private static async Task StoreAsync(string path, byte[] content, CancellationToken cancellationToken)
    {
        if (File.Exists(path))
            return;

        string temporaryPath = $"{path}.{Guid.NewGuid():N}.tmp";
        try
        {
            await File.WriteAllBytesAsync(temporaryPath, content, cancellationToken);
            try
            {
                File.Move(temporaryPath, path);
            }
            catch (IOException) when (File.Exists(path))
            {
                File.Delete(temporaryPath);
            }
        }
        finally
        {
            if (File.Exists(temporaryPath))
                File.Delete(temporaryPath);
        }
    }

    private string PathForHash(string hash) => Path.Combine(cachePath, $"{hash}.osu");

    private static string NormalizeMd5(string? value)
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
