# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0-alpine3.24 AS performance-build

WORKDIR /src

ARG TARGETARCH

COPY tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj tools/osu-performance-worker/OsuPerformanceWorker/
RUN test "$TARGETARCH" = "amd64" \
    || { echo "Unsupported target architecture: $TARGETARCH (only amd64 is supported)" >&2; exit 1; }
RUN dotnet restore tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj \
    --runtime linux-musl-x64

COPY tools/osu-performance-worker/OsuPerformanceWorker/ tools/osu-performance-worker/OsuPerformanceWorker/
RUN dotnet publish tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj \
    --configuration Release \
    --runtime linux-musl-x64 \
    --self-contained true \
    --no-restore \
    --output /out \
    -p:PublishSingleFile=true \
    -p:EnableCompressionInSingleFile=true \
    -p:DebugType=None \
    -p:DebugSymbols=false

FROM node:24-alpine3.24 AS node-build

WORKDIR /src

COPY package.json package-lock.json ./
RUN mkdir -p src && npm ci

COPY tsconfig.json index.ts ./
COPY src/ ./src/
COPY assets/ ./assets/
RUN npm run build:node && npm prune --omit=dev

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0-alpine3.24 AS runtime

WORKDIR /usr/osubot

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    OSU_PERFORMANCE_WORKER_PATH=/usr/local/lib/osu-performance-worker/OsuPerformanceWorker

COPY --from=node-build /usr/local/bin/node /usr/local/bin/node
COPY --from=node-build /src/node_modules/ ./node_modules/
COPY --from=node-build /src/build/ ./build/
RUN --mount=type=bind,source=tools/runtime-smoke-test.mjs,target=/tmp/runtime-smoke-test.mjs,ro \
    node /tmp/runtime-smoke-test.mjs

COPY --from=performance-build /out/ /usr/local/lib/osu-performance-worker/
RUN /usr/local/lib/osu-performance-worker/OsuPerformanceWorker --self-test

COPY healthcheck.js LICENSE NOTICE ./

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./build"]
