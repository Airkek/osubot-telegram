using System.Globalization;
using Newtonsoft.Json;
using osu.Framework.Logging;
using osu.Game.Beatmaps.Formats;

namespace OsuPerformanceWorker;

internal static class Program
{
    private static readonly SemaphoreSlim outputLock = new(1, 1);

    public static async Task<int> Main(string[] args)
    {
        CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
        CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
        Logger.Enabled = false;
        using var rulesetStore = new BuiltInRulesetStore();
        Decoder.RegisterDependencies(rulesetStore);
        LegacyDifficultyCalculatorBeatmapDecoder.Register();

        if (args is ["--self-test"])
        {
            WorkerSelfTest.Run();
            await Console.Out.WriteLineAsync("{\"ok\":true,\"modes\":[0,1,2,3]}");
            return 0;
        }

        if (args.Length > 0)
        {
            await Console.Error.WriteLineAsync($"Unknown argument '{args[0]}'");
            return 2;
        }

        int concurrency = Math.Max(1, Environment.ProcessorCount);
        using var limiter = new SemaphoreSlim(concurrency, concurrency);
        var tasks = new HashSet<Task>();

        while (await Console.In.ReadLineAsync() is { } line)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            await limiter.WaitAsync();
            tasks.RemoveWhere(task => task.IsCompleted);
            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await ProcessLine(line);
                }
                finally
                {
                    limiter.Release();
                }
            }));
        }

        await Task.WhenAll(tasks);
        return 0;
    }

    private static async Task ProcessLine(string line)
    {
        WorkerRequest? request = null;
        WorkerResponse response;
        try
        {
            request = JsonConvert.DeserializeObject<WorkerRequest>(line)
                ?? throw new JsonSerializationException("Request is empty");
            object result = request.Operation switch
            {
                "beatmap" => CalculatorOperations.CalculateBeatmap(
                    RequiredPath(request.BeatmapPath, "beatmap_path"), request.Mode, request.Mods),
                "performance" => CalculatorOperations.CalculatePerformance(
                    RequiredPath(request.BeatmapPath, "beatmap_path"),
                    request.Mode,
                    request.Mods,
                    request.Score ?? throw new ArgumentException("score is required")),
                "replay_header" => ReplayOperations.ReadHeader(RequiredPath(request.ReplayPath, "replay_path")),
                "replay" => ReplayOperations.Decode(
                    RequiredPath(request.ReplayPath, "replay_path"),
                    RequiredPath(request.BeatmapPath, "beatmap_path")),
                _ => throw new ArgumentException($"Unknown operation '{request.Operation}'")
            };
            response = new WorkerResponse { Id = request.Id, Result = result };
        }
        catch (Exception error)
        {
            response = new WorkerResponse
            {
                Id = request?.Id ?? string.Empty,
                Error = new WorkerError
                {
                    Type = error.GetType().Name,
                    Message = error.Message
                }
            };
        }

        string json = JsonConvert.SerializeObject(response);
        await outputLock.WaitAsync();
        try
        {
            await Console.Out.WriteLineAsync(json);
            await Console.Out.FlushAsync();
        }
        finally
        {
            outputLock.Release();
        }
    }

    private static string RequiredPath(string? path, string name)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException($"{name} is required");
        if (!File.Exists(path))
            throw new FileNotFoundException($"{name} does not exist", path);
        return path;
    }
}
