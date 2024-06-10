# osubot
Port of OctoDumb's [osubot-old](https://github.com/OctoDumb/osubot-old) to telegram

## port TODO:
- [X] all basic commands (nick/user/recent/top)
- [ ] chat leaderboard
- [ ] inline keyboard
- [ ] update pp 
- [ ] correct find command 
- [ ] help on telegraph

# Try it out!
Telegram: https://t.me/osulegacybot

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
