# osu!bot Grafana

Dashboards:

- Private: https://grafana.keijia.cyou/d/osubot-production
- Public-ready: https://grafana.keijia.cyou/d/osubot-public

Both JSON files preserve the original `old_grafana.json` layout with all 58 existing panel IDs, section order, and visualization styles. Six video-size cards and four video-measurement charts are appended at the end of Render without moving existing panels. The Telegram and VK startup cards each occupy half the top row; the summary row places both onboarding counters next to each other. Queries are updated for the current Telegram/VK schema. The default range is 24 hours, refreshed every 5 minutes, with Moscow timezone.

Chart `maxDataPoints` and minimum intervals are copied from the original JSON: most time-series panels use 24 points, while sampled-metric panels retain their 15-minute minimum. There is no datasource-wide minimum interval override. Error charts retain bars. Renderer charts aggregate platforms into the original `experimental` and `ordr` series. Lines connect missing samples to preserve the original continuous presentation.

The private dashboard has a platform selector, raw renderer error details, individual cached player statistics, and custom skin IDs. The public-ready dashboard has a fixed PostgreSQL datasource, no template variables, aggregate player statistics, and aggregate failures without raw errors or custom-upload identifiers. External sharing remains disabled; the public-ready name does not itself grant anonymous access. Grafana externally shared dashboards do not support template variables.

## Metric meanings

- Incoming events include messages, callbacks and updates later limited by rate limiting
- Commands exclude `Main` navigation through buttons and include handled failures
- Active accounts and dialogs use commands; accounts from different platforms remain separate
- Legacy Telegram event IDs and current internal IDs are normalized through `external_id`
- Daily active accounts use Moscow calendar days; WAU and MAU use rolling 7-day and 30-day windows ending on each plotted Moscow day
- Render success is `success / (success + failed)` among completions in the selected range; summary cards have no value with no completions, while the historical success-rate chart displays idle intervals as 100% as in the original dashboard
- Render success is recorded before video delivery; events have no correlation ID or measured rendering latency
- Rendered video duration is the playback length of the produced video; rendered video size is its actual file size
- Current game links/settings use `EXISTS` against selected platform accounts to avoid counting linked people twice; current snapshots ignore the time picker
- Historical linked-user counts are per platform and cannot be added without counting linked people twice
- The metadata cache is shared between platforms and is never summed across them
- Last startup identities have separate fixed Telegram and VK cards; they are recorded events, not process health checks
- Time since the last startup uses the original `DD:HH:MM:SS` string format
- Onboarding has separate fixed Telegram and VK counters; these platform-specific snapshots ignore the platform selector
- The removed file-cache metric is replaced by a VK onboarding card and periodic telemetry samples in the same panel slots

## Produced-video measurements

Panels 62–65 show average and total video duration/file size in each time bucket, split into the original `experimental` and `ordr` series. Panels 66–71 show average and total file size over the entire selected period, each for all renderers, `o!rdr`, and `experimental`. The private dashboard applies its existing platform filter; the public dashboard keeps its fixed Telegram/VK selection and contains no template variables. Duration uses seconds and file size uses bytes. Chart resolution follows the original Render panels (`maxDataPoints: 24`).

Measurements start only after the bot version with migration 38 and the telemetry instrumentation is deployed. Migration 38 adds nullable `video_duration_seconds DOUBLE PRECISION` and `video_size_bytes BIGINT` columns to `bot_events_render`; historical rows remain null. Only successful-render measurements are aggregated. Unknown measurements are excluded; empty periods remain without a value rather than becoming zero. Video playback duration does not measure time spent rendering, and total produced-video size is not a measurement of disk usage or network traffic.

The bot probes the completed video with `ffprobe` (provided by the runtime image's `ffmpeg` package), keeping fractional seconds and exact bytes in telemetry. HTTP HEAD is used only if the probe cannot determine file size. Telegram receives the measured duration rounded up to whole seconds; if probing fails, delivery continues without a supplied duration or invented telemetry values. The runtime image smoke test checks that `ffprobe` is executable.

When the preferred renderer is unavailable, the bot checks the other renderer if it supports the game mode. The per-request choice does not change stored user preferences. o!rdr API errors 40/41 explicitly refusing new jobs also allow one fallback to `experimental`; rejected/corrupt replays and ambiguous upload failures are not automatically resubmitted. Telemetry attributes attempts and video measurements to the renderer actually used.

The new queries use a bounded `jsonb_to_record(to_jsonb(event))` projection so the dashboards also work against the previous database schema. Before migration 38, missing fields decode to null and the tables show no measurements. This projection adds per-row conversion overhead but does not require any schema changes to install the dashboards. Existing panels, intervals and query limits remain unchanged.

## Server files

The deployment lives entirely under `/media/disk1/grafana`:

```text
docker-compose.yml                 existing Grafana service
docker-compose.override.yml        mounts and external bot network
osubot-db.env                      server-only connection credentials, mode 0600
renderer.env                       server-only renderer token, mode 0600
provisioning/datasources/osubot.yaml
provisioning/dashboards/osubot.yaml
dashboards/osubot-production.json
dashboards/osubot-public.json
osubot-query-validation.json        measured query plans
osubot-public-query-validation.json public-specific query plans
backups/<timestamp>/                original compose and stopped Grafana SQLite backup
```

The datasource uses the existing production database credentials supplied on the server. Provisioning does not create roles, indexes, views, tables, or database policies. The dashboard contains SELECT queries only; SQL validation uses explicit read-only transactions. The datasource pool is capped at two connections. Database credentials must never be committed.

To update the dashboards, copy both JSON files into the server's `dashboards` directory. Grafana checks for file changes every 30 seconds. The initial installation also copies the provisioning files and compose override, writes the server-only environment file, and recreates only the Grafana service. PostgreSQL and the bot do not need a restart.

UI edits are allowed, but a subsequent file update overwrites the provisioned dashboard. Export UI edits back into this JSON to preserve them.

The official Grafana Image Renderer v5.0.0 runs as `mon_grafana_renderer`, pinned to its image digest in the compose override. It has no published host ports and uses a shared token from `renderer.env`. Grafana MCP image rendering has been verified against both dashboards.

To remove this deployment, remove the added compose override/mounts, datasource/provider files and dashboard file, then recreate Grafana. Restore the saved SQLite backup while Grafana is stopped if an exact pre-installation state is needed.
