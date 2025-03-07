import { Logger, ILogObj } from "tslog";
import { Bot, IBotConfig } from "./src/Bot";

const config: IBotConfig = {
    tg: {
        token: process.env.TELEGRAM_TOKEN,
        owner: Number(process.env.TELEGRAM_OWNER_ID),
    },
    tokens: {
        bancho_v2_app_id: Number(process.env.OSU_V2_APP_ID),
        bancho_v2_secret: process.env.OSU_V2_CLIENT_SECRET,
    },
};

declare global {
    interface Global {
        logger: Logger<ILogObj>;
    }
}

global.logger = new Logger<ILogObj>();

global.logger.info("Starting...");
const bot: Bot = new Bot(config);

bot.start();
