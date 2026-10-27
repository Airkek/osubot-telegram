using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Microsoft.Data.Sqlite;
using osu.Game.Rulesets.Catch.Difficulty;
using osu.Game.Rulesets.Difficulty;
using osu.Game.Rulesets.Mania.Difficulty;
using osu.Game.Rulesets.Osu.Difficulty;
using osu.Game.Rulesets.Taiko.Difficulty;

namespace OsuPerformanceServer;

internal sealed class StrainCache : IDisposable
{
    private const int schemaVersion = 1;
    private static readonly JsonSerializerOptions jsonOptions = CreateJsonOptions();
    private readonly string connectionString;
    private readonly string version;
    private readonly ILogger<StrainCache> logger;

    public StrainCache(IConfiguration configuration, ILogger<StrainCache> logger)
    {
        this.logger = logger;
        string cachePath = Path.GetFullPath(
            configuration["STRAIN_CACHE_PATH"] ?? Path.Combine(AppContext.BaseDirectory, "strain-cache"));
        Directory.CreateDirectory(cachePath);
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = Path.Combine(cachePath, "strains.db")
        }.ToString();
        string lazerVersion = typeof(StrainCache).Assembly.GetCustomAttributes<AssemblyMetadataAttribute>()
            .Single(attribute => attribute.Key == "LazerVersion").Value!;
        version = $"{lazerVersion}:{schemaVersion}:{configuration["PP_SYSTEM_VERSION"] ?? "1"}";

        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS strains (
                md5 TEXT NOT NULL,
                mode INTEGER NOT NULL,
                mods TEXT NOT NULL,
                version TEXT NOT NULL,
                valid INTEGER NOT NULL,
                payload TEXT NOT NULL,
                PRIMARY KEY (md5, mode, mods)
            );
            UPDATE strains SET valid = 0 WHERE version <> $version AND valid = 1;
            """;
        command.Parameters.AddWithValue("$version", version);
        int invalidated = command.ExecuteNonQuery();
        logger.LogInformation("Strain cache version {Version}: invalidated {Count} stale entries", version, invalidated);
    }

    public async Task<BeatmapCalculation?> GetAsync(string md5, int mode, string mods, CancellationToken cancellationToken)
    {
        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT payload FROM strains
            WHERE md5 = $md5 AND mode = $mode AND mods = $mods AND version = $version AND valid = 1
            """;
        AddKey(command, md5, mode, mods);
        string? payload = await command.ExecuteScalarAsync(cancellationToken) as string;
        if (payload == null)
            return null;

        try
        {
            BeatmapCalculation calculation = JsonSerializer.Deserialize<BeatmapCalculation>(payload, jsonOptions)
                ?? throw new JsonException("Empty strain cache entry");
            if (calculation.Mode != mode)
                throw new JsonException("Strain cache ruleset mismatch");
            return calculation;
        }
        catch (JsonException error)
        {
            logger.LogWarning(error, "Invalidating unreadable strains for {Md5} in mode {Mode}", md5, mode);
            command.CommandText = """
                UPDATE strains SET valid = 0
                WHERE md5 = $md5 AND mode = $mode AND mods = $mods AND version = $version
                """;
            await command.ExecuteNonQueryAsync(cancellationToken);
            return null;
        }
    }

    public async Task StoreAsync(
        string md5,
        int mode,
        string mods,
        BeatmapCalculation calculation,
        CancellationToken cancellationToken)
    {
        string payload = JsonSerializer.Serialize(calculation, jsonOptions);
        using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO strains (md5, mode, mods, version, valid, payload)
            VALUES ($md5, $mode, $mods, $version, 1, $payload)
            ON CONFLICT (md5, mode, mods) DO UPDATE SET
                version = excluded.version, valid = 1, payload = excluded.payload
            """;
        AddKey(command, md5, mode, mods);
        command.Parameters.AddWithValue("$payload", payload);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public void Dispose()
    {
        using var connection = new SqliteConnection(connectionString);
        SqliteConnection.ClearPool(connection);
    }

    private void AddKey(SqliteCommand command, string md5, int mode, string mods)
    {
        command.Parameters.AddWithValue("$md5", md5);
        command.Parameters.AddWithValue("$mode", mode);
        command.Parameters.AddWithValue("$mods", mods);
        command.Parameters.AddWithValue("$version", version);
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var resolver = new DefaultJsonTypeInfoResolver();
        resolver.Modifiers.Add(info =>
        {
            if (!typeof(DifficultyAttributes).IsAssignableFrom(info.Type))
                return;
            JsonPropertyInfo? mods = info.Properties.SingleOrDefault(property => property.Name == nameof(DifficultyAttributes.Mods));
            if (mods != null)
                info.Properties.Remove(mods);
            if (info.Type == typeof(DifficultyAttributes))
                info.PolymorphismOptions = new JsonPolymorphismOptions
                {
                    TypeDiscriminatorPropertyName = "ruleset",
                    DerivedTypes =
                    {
                        new JsonDerivedType(typeof(OsuDifficultyAttributes), 0),
                        new JsonDerivedType(typeof(TaikoDifficultyAttributes), 1),
                        new JsonDerivedType(typeof(CatchDifficultyAttributes), 2),
                        new JsonDerivedType(typeof(ManiaDifficultyAttributes), 3)
                    }
                };
        });
        return new JsonSerializerOptions
        {
            TypeInfoResolver = resolver,
            IncludeFields = true,
            RespectNullableAnnotations = true,
            RespectRequiredConstructorParameters = true,
            NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
        };
    }
}
