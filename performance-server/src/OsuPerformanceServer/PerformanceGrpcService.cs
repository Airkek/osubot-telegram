using Grpc.Core;
using Newtonsoft.Json;
using Contract = OsuPerformanceServer.Grpc.V1;

namespace OsuPerformanceServer;

internal sealed class PerformanceGrpcService(BeatmapStore beatmaps, ILogger<PerformanceGrpcService> logger)
    : Contract.PerformanceService.PerformanceServiceBase
{
    public override Task<Contract.HealthResponse> Health(
        Contract.HealthRequest request,
        ServerCallContext context) => Task.FromResult(new Contract.HealthResponse
        {
            Status = "ok",
            Version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "unknown"
        });

    public override Task<Contract.BeatmapAttributes> CalculateBeatmap(
        Contract.CalculateBeatmapRequest request,
        ServerCallContext context) => ExecuteAsync(async () =>
    {
        FileWorkingBeatmap beatmap = await ResolveBeatmapAsync(request.Beatmap, context.CancellationToken);
        BeatmapResult result = CalculatorOperations.CalculateBeatmap(beatmap, request.Mode, GrpcMapper.ToDomain(request.Mods));
        return GrpcMapper.ToContract(result);
    }, context);

    public override Task<Contract.PerformanceAttributes> CalculatePerformance(
        Contract.CalculatePerformanceRequest request,
        ServerCallContext context) => ExecuteAsync(async () =>
    {
        if (request.Score == null)
            throw new ArgumentException("score is required");
        FileWorkingBeatmap beatmap = await ResolveBeatmapAsync(request.Beatmap, context.CancellationToken);
        PerformanceResult result = CalculatorOperations.CalculatePerformance(
            beatmap,
            request.Mode,
            GrpcMapper.ToDomain(request.Mods),
            GrpcMapper.ToDomain(request.Score));
        return GrpcMapper.ToContract(result);
    }, context);

    public override Task<Contract.ReplayHeader> ReadReplayHeader(
        Contract.ReadReplayHeaderRequest request,
        ServerCallContext context) => ExecuteAsync(() =>
    {
        RequireReplay(request.Replay.Length);
        return Task.FromResult(GrpcMapper.ToContract(ReplayOperations.ReadHeader(request.Replay.Memory)));
    }, context);

    public override Task<Contract.Replay> DecodeReplay(
        Contract.DecodeReplayRequest request,
        ServerCallContext context) => ExecuteAsync(async () =>
    {
        RequireReplay(request.Replay.Length);
        FileWorkingBeatmap beatmap = await ResolveBeatmapAsync(request.Beatmap, context.CancellationToken);
        return GrpcMapper.ToContract(ReplayOperations.Decode(request.Replay.Memory, beatmap));
    }, context);

    private async Task<FileWorkingBeatmap> ResolveBeatmapAsync(
        Contract.BeatmapReference? reference,
        CancellationToken cancellationToken)
    {
        if (reference == null)
            throw new ArgumentException("beatmap is required");
        return await beatmaps.GetAsync(
            reference.BeatmapId,
            reference.ExpectedMd5,
            reference.Content.Memory,
            cancellationToken);
    }

    private async Task<T> ExecuteAsync<T>(Func<Task<T>> operation, ServerCallContext context)
    {
        try
        {
            return await operation();
        }
        catch (RpcException)
        {
            throw;
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw new RpcException(new Status(StatusCode.Cancelled, "Request was cancelled"));
        }
        catch (BeatmapHashMismatchException error)
        {
            throw new RpcException(new Status(StatusCode.FailedPrecondition, error.Message));
        }
        catch (HttpRequestException error)
        {
            throw new RpcException(new Status(StatusCode.Unavailable, $"Beatmap download failed: {error.Message}"));
        }
        catch (ArgumentException error)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, error.Message));
        }
        catch (InvalidDataException error)
        {
            throw new RpcException(new Status(StatusCode.FailedPrecondition, error.Message));
        }
        catch (JsonException error)
        {
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"Invalid mod settings: {error.Message}"));
        }
        catch (Exception error)
        {
            logger.LogError(error, "Performance request {Method} failed", context.Method);
            throw new RpcException(new Status(StatusCode.Internal, "Performance calculation failed"));
        }
    }

    private static void RequireReplay(int length)
    {
        if (length == 0)
            throw new ArgumentException("replay is required");
    }
}
