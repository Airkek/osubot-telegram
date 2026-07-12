FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS performance-build

WORKDIR /src

COPY tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj tools/osu-performance-worker/OsuPerformanceWorker/
RUN dotnet restore tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj --runtime linux-musl-x64

COPY tools/osu-performance-worker/OsuPerformanceWorker/ tools/osu-performance-worker/OsuPerformanceWorker/
RUN dotnet publish tools/osu-performance-worker/OsuPerformanceWorker/OsuPerformanceWorker.csproj \
    --configuration Release \
    --runtime linux-musl-x64 \
    --self-contained true \
    --no-restore \
    --output /out \
    -p:PublishSingleFile=true

FROM node:24-alpine

WORKDIR /usr/osubot

COPY . .
RUN npm ci
RUN npm run build:node

RUN apk add --no-cache libgcc libstdc++ zlib
COPY --from=performance-build /out/ /usr/local/lib/osu-performance-worker/

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
ENV OSU_PERFORMANCE_WORKER_PATH=/usr/local/lib/osu-performance-worker/OsuPerformanceWorker

CMD ["npm", "start"]
