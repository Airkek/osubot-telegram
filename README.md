# osubot
Port of OctoDumb's [osubot-old](https://github.com/OctoDumb/osubot-old) to telegram with various improvements and additional features

# Try it out!
Telegram: https://t.me/osulegacybot

# Features (not full list):
- replay rendering by using [o!rdr](https://ordr.issou.best/) and [osu-replay-viewer-continued](https://github.com/Airkek/osu-replay-viewer-continued/)
- osu! lazer support
- Multi-language (en/ru/zh)
- osu! custom servers support
  - [Gatari](https://osu.gatari.pw)
  - [Akatsuki](https://akatsuki.gg)
  - [Ripple](https://ripple.moe)
  - Want to add your server? Consider open issue/pull request
- BeatSaber support
  - [BeatLeader](https://beatleader.com/)
  - [ScoreSaber](https://scoresaber.com/)
- Recent play info
- Score on specified beatmap info
- Game profile info
- Player's top scores
- Chat members leaderboard
- Chat members leaderboard on specified beatmap
- Many more!

## How to run (docker):
1. Download compose file

```bash
mkdir osubot-telegram && cd osubot-telegram
wget https://raw.githubusercontent.com/Airkek/osubot-telegram/refs/heads/master/docker-compose.yml
```

2. Fill .env:

```bash
wget -O .env https://raw.githubusercontent.com/Airkek/osubot-telegram/refs/heads/master/.env.example
nano .env
```

3. Start container:

```bash
docker compose up -d
```

4. Update (if necessary)
```bash
docker compose pull
```
