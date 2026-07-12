# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine3.24 AS build

WORKDIR /src

RUN apk add --no-cache grpc-plugins protoc

ENV PROTOBUF_PROTOC=/usr/bin/protoc \
    GRPC_PROTOC_PLUGIN=/usr/bin/grpc_csharp_plugin

COPY performance-server/src/OsuPerformanceServer/OsuPerformanceServer.csproj performance-server/src/OsuPerformanceServer/
COPY contracts/ contracts/
RUN dotnet restore performance-server/src/OsuPerformanceServer/OsuPerformanceServer.csproj \
    --use-current-runtime \
    -p:SelfContained=true

COPY performance-server/src/OsuPerformanceServer/ performance-server/src/OsuPerformanceServer/
RUN dotnet publish performance-server/src/OsuPerformanceServer/OsuPerformanceServer.csproj \
    --configuration Release \
    --no-restore \
    --output /out \
    --use-current-runtime \
    --self-contained true \
    -p:PublishSingleFile=true \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:EnableCompressionInSingleFile=true \
    -p:DebugType=None \
    -p:DebugSymbols=false

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine3.24 AS runtime

WORKDIR /usr/local/lib/osu-performance-server

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    PERFORMANCE_SERVER_PORT=50051 \
    BEATMAP_CACHE_PATH=/var/lib/osu-performance/beatmaps

RUN mkdir -p "$BEATMAP_CACHE_PATH"

COPY --from=build /out/ ./
RUN command -v nc >/dev/null \
    && ./OsuPerformanceServer --self-test

EXPOSE 50051

ENTRYPOINT ["/usr/local/lib/osu-performance-server/OsuPerformanceServer"]
