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
- [ ] updates notify

# additional features:
- [X] full lazer support (api v2)
- [X] calculate pp using latest formula (by using rosu-pp.js)
- [X] removed dead servers (r.i.p: kurikku, vudek, enjuu, sakuru)
- [X] auth api v2 by client secret

## How to run:

1. Clone repository

```
git clone https://github.com/Airkek/osubot-telegram
cd osubot-telegram
```

2. Install dependencdies

```
npm i
```

3. Create a config `config.json`
```jsonc
{
    "tg": {
        "token": "Your bot token",
        "owner": 5435325 // Your telegram ID
    },
    "tokens": {
        "bancho_v1": "Bancho v1 token",
        "bancho_v2_app_id": 123, // your osu app id
        "bancho_v2_secret": "osu app client_secret"
    },
}
```

4. Build & run

```
npx tsc
npm start
```
