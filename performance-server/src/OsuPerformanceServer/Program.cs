using System.Globalization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using osu.Framework.Logging;
using osu.Game.Beatmaps.Formats;

namespace OsuPerformanceServer;

internal static class Program
{
    private const int defaultPort = 50051;
    private const int maxMessageSize = 64 * 1024 * 1024;

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
            ServerSelfTest.Run();
            await Console.Out.WriteLineAsync("{\"ok\":true,\"modes\":[0,1,2,3]}");
            return 0;
        }

        ServerSelfTest.Run();
        int port = ParsePort(Environment.GetEnvironmentVariable("PERFORMANCE_SERVER_PORT"));
        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.ListenAnyIP(port, listen => listen.Protocols = HttpProtocols.Http2);
        });
        builder.Services.AddGrpc(options =>
        {
            options.MaxReceiveMessageSize = maxMessageSize;
            options.MaxSendMessageSize = maxMessageSize;
        });
        builder.Services.AddHttpClient("beatmaps", client =>
        {
            string baseUrl = builder.Configuration["BEATMAP_DOWNLOAD_BASE_URL"] ?? "https://osu.ppy.sh/osu/";
            client.BaseAddress = new Uri(baseUrl.EndsWith('/') ? baseUrl : baseUrl + "/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        builder.Services.AddSingleton<BeatmapStore>();

        WebApplication app = builder.Build();
        app.MapGrpcService<PerformanceGrpcService>();
        app.Logger.LogInformation("osu! performance server listening on port {Port}", port);
        await app.RunAsync();
        return 0;
    }

    private static int ParsePort(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return defaultPort;
        if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out int port)
            || port is < 1 or > 65535)
            throw new ArgumentException($"Invalid PERFORMANCE_SERVER_PORT '{value}'");
        return port;
    }
}
