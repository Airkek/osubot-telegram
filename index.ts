import {Bot, IBotConfig} from './src/Bot';
import fs from "fs";
import * as secrets from 'secrets-js';

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

var config: IBotConfig = {};

if (fs.existsSync("./config.json")) {
    config = JSON.parse(fs.readFileSync("./config.json").toString());
} else {
    config = {
        osu: {
            username: "osu username",
            password: "osu password"
        },
        tg: {
            token: "telegram_token",
            owner: 0
        },
        tokens: {
            bancho: "bancho_api_v1_token"
        },
    };
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
    console.log("please, fill the config.json file");
    process.exit(0);
}


var secret = ""
if (fs.existsSync("./secret")) {
    secret = fs.readFileSync("./secret").toString();
} else {
    secret = makeid(32);
    fs.writeFileSync("./secret", secret);
}

if (!config.osu.passwordEncrypted) {
    config.osu.passwordEncrypted = true;
    config.osu.password = secrets.encode(secret, config.osu.password);
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}

var bot: Bot = new Bot(config, secret);

bot.start();