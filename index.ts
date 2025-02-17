import {Bot, IBotConfig} from './src/Bot';

var config: IBotConfig = {
    tg: {
        token: process.env.TELEGRAM_TOKEN,
        owner: Number(process.env.TELEGRAM_OWNER_ID)
    },
    tokens: {
        bancho_v2_app_id: Number(process.env.OSU_V2_APP_ID),
        bancho_v2_secret: process.env.OSU_V2_CLIENT_SECRET
    }
};

var bot: Bot = new Bot(config);

bot.start();