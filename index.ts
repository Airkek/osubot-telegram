import { Logger, ILogObj } from "tslog";
import { TelegramBotAdapter, TelegramBotConfig } from "./src/Telegram/Bot";
import { ApplicationRuntime, RuntimeConfig } from "./src/core/ApplicationRuntime";
import PostgresStorage from "./src/data/PostgresStorage";
import dotenv from "dotenv";
dotenv.config();

const config: TelegramBotConfig = {
    token: process.env.TELEGRAM_TOKEN,
    owner: Number(process.env.TELEGRAM_OWNER_ID),
};

const runtimeConfig: RuntimeConfig = {
    banchoAppId: Number(process.env.OSU_V2_APP_ID),
    banchoClientSecret: process.env.OSU_V2_CLIENT_SECRET,
};

declare global {
    interface Global {
        logger: Logger<ILogObj>;
    }
}

global.logger = new Logger<ILogObj>();

let bot: TelegramBotAdapter;
let runtime: ApplicationRuntime;
let stopping = false;

async function main(): Promise<void> {
    global.logger.info("Starting...");
    bot = new TelegramBotAdapter(config);
    const storage = PostgresStorage.fromEnvironment(bot.platform);
    runtime = ApplicationRuntime.create(runtimeConfig, storage, bot);
    await runtime.initialize();
    const identity = await bot.start(runtime);
    await runtime.markStarted(identity);
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (stopping) {
        return;
    }
    stopping = true;
    global.logger.info(`Received ${signal}, stopping...`);
    try {
        await bot?.stop();
        await runtime?.stop();
        process.exit(0);
    } catch (error) {
        global.logger.fatal("Failed to stop bot", error);
        process.exit(1);
    }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

void main().catch((error) => {
    global.logger.fatal("Failed to start bot", error);
    process.exit(1);
});
