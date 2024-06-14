# osubot
Port of OctoDumb's [osubot-old](https://github.com/OctoDumb/osubot-old) to telegram

# Try it out!
Telegram: https://t.me/osulegacybot

## port TODO:
- [X] all basic commands (nick/user/recent/top)
- [X] chat leaderboard
- [X] inline keyboard
- [X] update calculator to new formula 
- [X] make find command works 
- [ ] move help to telegraph
- [ ] fix updates notify

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
