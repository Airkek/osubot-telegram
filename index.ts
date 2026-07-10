import { Logger, ILogObj } from "tslog";
import { Bot, IBotConfig } from "./src/Bot";
import dotenv from "dotenv";
dotenv.config();

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

async function main(): Promise<void> {
    global.logger.info("Starting...");
    const bot = new Bot(config);
    await bot.start();
}

void main().catch((error) => {
    global.logger.fatal("Failed to start bot", error);
    process.exit(1);
});
