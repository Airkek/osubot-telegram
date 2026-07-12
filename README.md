# osu! legacy bot

Multi-platform chat bot for osu! and Beat Saber. A single instance can serve Telegram and VK simultaneously while sharing one application runtime and linked user identity.

The project originated as a port of OctoDumb's [osubot-old](https://github.com/OctoDumb/osubot-old).

## Public bots

- Telegram: https://t.me/osulegacybot
- VK: https://vk.com/osulegacybot

## Features

- osu!stable and osu!lazer scores, profiles, recent plays and top scores
- Gatari, Ripple and Akatsuki support, including their additional play styles
- BeatLeader and ScoreSaber support
- Image cards and text output in English, Russian and Chinese
- Chat leaderboards and leaderboards for a selected beatmap
- Accounts that can be linked across supported bot platforms
- Replay rendering through [o!rdr](https://ordr.issou.best/) or [osu-replay-viewer-continued](https://github.com/Airkek/osu-replay-viewer-continued/) via [osubot-orv-runner](https://github.com/Airkek/osubot-orv-runner)

## Run with Docker Compose

Docker Compose starts the bot, the osu! performance server, PostgreSQL and a local Telegram Bot API server.

1. Create a deployment directory and download the Compose file:

```bash
mkdir osubot-telegram
cd osubot-telegram
wget https://raw.githubusercontent.com/Airkek/osubot-telegram/refs/heads/master/docker-compose.yml
```

2. Download and edit the environment template:

```bash
wget -O .env https://raw.githubusercontent.com/Airkek/osubot-telegram/refs/heads/master/.env.example
nano .env
```

Configure osu! API credentials, PostgreSQL credentials and at least one complete platform credential set:

- `TELEGRAM_TOKEN` and `TELEGRAM_OWNER_ID` for Telegram
- `VK_TOKEN` and `VK_OWNER_ID` for VK

When both sets are present, both adapters start in the same process. `BOT_PLATFORMS` is an optional comma-separated override; when empty, configured platforms are detected automatically. `VK_USER_TOKEN` is optional and is only required for uploading private video attachments to VK.

If the bundled local Telegram Bot API is enabled, also configure `TELEGRAM_APP_API_ID` and `TELEGRAM_APP_API_HASH`. See [.env.example](.env.example) for the remaining settings and comments.

3. Start the services:

```bash
docker compose up -d
```

Database schema migrations run automatically when the bot starts.

4. Update the deployment:

```bash
docker compose pull
docker compose up -d --remove-orphans
```

## Development

The bot and performance server are independently buildable. To build and test the bot with Node.js 24:

```bash
cd bot
npm ci
npm run build
npm test
npm run lint
```

To build and test the performance server with .NET 8:

```bash
dotnet test performance-server/OsuPerformanceServer.sln --configuration Release
```

Bot sources and runtime assets live under [`bot/`](bot/). The independently deployable gRPC performance service and its NUnit project live under [`performance-server/`](performance-server/); the shared versioned API contract lives under [`contracts/`](contracts/). The performance server owns the on-disk `.osu` cache, while the bot only keeps beatmap metadata.

## License

The original source code is licensed under GPL-3.0-only; see [LICENSE](LICENSE).

Files under [`bot/assets/`](bot/assets/) are third-party material and are expressly excluded from the GPL license grant. osu!-specific assets remain the property of ppy Pty Ltd and/or their respective rights holders. See [NOTICE](NOTICE) and [bot/assets/NOTICE](bot/assets/NOTICE) before reusing them.
