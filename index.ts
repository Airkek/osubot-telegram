import {Bot, IBotConfig} from './src/Bot';
import fs from "fs";
var config: IBotConfig = {};

if (fs.existsSync("./config.json")) {
    config = JSON.parse(fs.readFileSync("./config.json").toString());
} else {
    config = {
        tg: {
            token: "telegram_token",
            owner: 0
        },
        tokens: {
            bancho_v2_app_id: 123,
            bancho_v2_secret: "bancho_api_v2_secret",
        },
    };
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
    console.log("please, fill the config.json file");
    process.exit(0);
}


var bot: Bot = new Bot(config);

bot.start();