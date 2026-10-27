using System.Globalization;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace OsuPerformanceServer;

internal sealed class BeatmapStore : IDisposable
{
    private const int maxBeatmapSize = 50 * 1024 * 1024;
    private static readonly Regex md5Pattern = new("^[a-f0-9]{32}$", RegexOptions.Compiled);

    private readonly IHttpClientFactory httpClientFactory;
    private readonly ILogger<BeatmapStore> logger;
    private readonly string cachePath;
    private readonly SemaphoreSlim[] gates = Enumerable.Range(0, 64).Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    public BeatmapStore(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<BeatmapStore> logger)
    {
        this.httpClientFactory = httpClientFactory;
        this.logger = logger;
        cachePath = Path.GetFullPath(
            configuration["BEATMAP_CACHE_PATH"] ?? Path.Combine(AppContext.BaseDirectory, "beatmap-cache"));
        Directory.CreateDirectory(cachePath);
    }

    public async Task<FileWorkingBeatmap> GetAsync(
        long beatmapId,
        string? expectedMd5,
        ReadOnlyMemory<byte> suppliedContent,
        CancellationToken cancellationToken)
    {
        string expected = NormalizeMd5(expectedMd5);
        string hash = expected;
        if (suppliedContent.Length > 0)
        {
            hash = HashContent(suppliedContent, beatmapId);
            RequireExpectedHash(beatmapId, expected, hash);
        }

        string lockKey = hash.Length > 0 ? hash : $"id:{beatmapId}";
        SemaphoreSlim gate = gates[(uint)StringComparer.Ordinal.GetHashCode(lockKey) % gates.Length];
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (hash.Length > 0 && await ReadCachedAsync(hash, beatmapId, cancellationToken) is { } cached)
                return cached;

            byte[] content = suppliedContent.Length > 0
                ? suppliedContent.ToArray()
                : await DownloadAsync(beatmapId, cancellationToken);
            string actual = HashContent(content, beatmapId);
            RequireExpectedHash(beatmapId, expected, actual);

            cancellationToken.ThrowIfCancellationRequested();
            FileWorkingBeatmap beatmap = Decode(content, actual);
            await StoreAsync(PathForHash(actual), content, cancellationToken);
            return beatmap;
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

    private async Task<FileWorkingBeatmap?> ReadCachedAsync(string hash, long beatmapId, CancellationToken cancellationToken)
    {
        string path = PathForHash(hash);
        if (!File.Exists(path))
            return null;

        byte[] content;
        try
        {
            content = await File.ReadAllBytesAsync(path, cancellationToken);
        }
        catch (FileNotFoundException)
        {
            return null;
        }

        try
        {
            if (HashContent(content, beatmapId) != hash)
                throw new InvalidDataException("Cached beatmap checksum does not match its filename");
        }
        catch (InvalidDataException error)
        {
            logger.LogWarning(error, "Discarding invalid beatmap cache entry {Hash}", hash);
            File.Delete(path);
            return null;
        }
        return Decode(content, hash);
    }

    private static FileWorkingBeatmap Decode(byte[] content, string hash)
    {
        var beatmap = FileWorkingBeatmap.FromBytes(content);
        beatmap.BeatmapInfo.MD5Hash = hash;
        return beatmap;
    }

    private string PathForHash(string hash) => Path.Combine(cachePath, $"{hash}.osu");

    private void RequireExpectedHash(long beatmapId, string expected, string actual)
    {
        if (expected.Length == 0 || expected == actual)
            return;
        logger.LogWarning(
            "Beatmap {BeatmapId} hash mismatch: expected {ExpectedHash}, downloaded {ActualHash}",
            beatmapId, expected, actual);
        throw new BeatmapHashMismatchException(beatmapId, expected, actual);
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
            }
        }
        finally
        {
            if (File.Exists(temporaryPath))
                File.Delete(temporaryPath);
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
