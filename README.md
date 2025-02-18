# osubot
Port of OctoDumb's [osubot-old](https://github.com/OctoDumb/osubot-old) to telegram

# Try it out!
Telegram: https://t.me/osulegacybot

## port TODO:
- [X] all basic commands (nick/user/recent/top)
- [X] replay file info
- [X] chat leaderboard
- [X] inline keyboard
- [X] update calculator to new formula 
- [X] make find command works 
- [X] move help to telegraph
- [ ] ~updates notify~ - wontfix

# additional features:
- [X] full lazer support (api v2)
- [X] calculate pp using latest formula (by using rosu-pp.js)
- [X] removed dead servers (r.i.p: kurikku, vudek, enjuu, sakuru)
- [X] auth api v2 by client secret
- [X] BeatSaber support (BeatLeader + ScoreSaber)

## How to run:

1. Clone repository

```bash
git clone https://github.com/Airkek/osubot-telegram
cd osubot-telegram
```

2. Install dependencdies

```bash
npm install
```

3. Fill .env:

```bash
cp .env.example .env
nano .env
```

4. Build & run

```bash
npm run build
npm start
```

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