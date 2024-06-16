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
- [X] lazer support for bancho recent plays
- [X] lazer support for bancho top plays
- [X] calculate pp using latest formula (by using rosu-pp.js)
- [X] save osu api v2 credentials locally (do not authorize every run)


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
        "owner": 5435325 // Your ID
    },
    "tokens": {
        "bancho": "Bancho token",
        "ripple": "Ripple token (useless atm)"
    },
    "osu": {
        "username": "Your osu! username",
        "password": "Your osu! password"
    }
}
```

4. Build & run

```
npx tsc
npm start
```
