import { Logger, ILogObj } from "tslog";
import { TelegramBotAdapter, TelegramBotConfig } from "./src/Telegram/Bot";
import { VKBotAdapter, VKBotConfig } from "./src/VK/Bot";
import { ApplicationRuntime, RuntimeConfig } from "./src/core/ApplicationRuntime";
import { PlatformAdapter } from "./src/core/PlatformAdapter";
import { PlatformStorage } from "./src/core/PlatformStorage";
import { ApplicationHttpServer } from "./src/core/ApplicationHttpServer";
import { FluentLocalizer } from "./src/core/FluentLocalizer";
import path from "node:path";
import { Platform, SUPPORTED_PLATFORMS } from "./src/core/Identity";
import PostgresStorage from "./src/data/PostgresStorage";
import dotenv from "dotenv";
dotenv.config();

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

let bots: PlatformAdapter[] = [];
let runtime: ApplicationRuntime;
const httpServer = new ApplicationHttpServer();
const localizer = new FluentLocalizer(path.join(__dirname, "src", "locales"));
let stopping = false;

function requiredEnvironmentVariable(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}

function requiredNumericEnvironmentVariable(name: string): number {
    const value = Number(requiredEnvironmentVariable(name));
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}

function enabledPlatforms(): Platform[] {
    const configured = process.env.BOT_PLATFORMS?.trim();
    if (configured) {
        const platforms = [...new Set(configured.split(",").map((value) => value.trim().toLowerCase()))] as Platform[];
        if (platforms.length === 0 || platforms.some((platform) => !SUPPORTED_PLATFORMS.includes(platform))) {
            throw new Error(`BOT_PLATFORMS must be a comma-separated list of: ${SUPPORTED_PLATFORMS.join(", ")}`);
        }
        return platforms;
    }

    const credentialSets: Array<{ platform: Platform; variables: string[] }> = [
        { platform: "telegram", variables: ["TELEGRAM_TOKEN", "TELEGRAM_OWNER_ID"] },
        { platform: "vk", variables: ["VK_TOKEN", "VK_OWNER_ID"] },
    ];
    const platforms: Platform[] = [];
    for (const credentials of credentialSets) {
        const configuredVariables = credentials.variables.filter((name) => Boolean(process.env[name]?.trim()));
        if (configuredVariables.length > 0 && configuredVariables.length < credentials.variables.length) {
            const missing = credentials.variables.filter((name) => !process.env[name]?.trim());
            throw new Error(`Incomplete ${credentials.platform} credentials; missing: ${missing.join(", ")}`);
        }
        if (configuredVariables.length === credentials.variables.length) {
            platforms.push(credentials.platform);
        }
    }
    if (platforms.length === 0) {
        throw new Error("No bot platform credentials are configured");
    }
    return platforms;
}

function createPlatformAdapter(platform: Platform): PlatformAdapter {
    switch (platform) {
        case "vk": {
            const config: VKBotConfig = {
                token: requiredEnvironmentVariable("VK_TOKEN"),
                userToken: process.env.VK_USER_TOKEN?.trim() || undefined,
                owner: requiredNumericEnvironmentVariable("VK_OWNER_ID"),
            };
            return new VKBotAdapter(config, localizer);
        }
        case "telegram": {
            const config: TelegramBotConfig = {
                token: requiredEnvironmentVariable("TELEGRAM_TOKEN"),
                owner: requiredNumericEnvironmentVariable("TELEGRAM_OWNER_ID"),
            };
            return new TelegramBotAdapter(config, httpServer.app, localizer);
        }
    }
}

async function main(): Promise<void> {
    global.logger.info("Starting...");
    localizer.initialize();
    bots = enabledPlatforms().map(createPlatformAdapter);
    const storage = new PlatformStorage(PostgresStorage.fromEnvironmentForPlatforms(bots.map((bot) => bot.platform)));
    runtime = ApplicationRuntime.create(runtimeConfig, storage, bots);
    await runtime.initialize();
    httpServer.start();
    const started: PlatformAdapter[] = [];
    try {
        for (const bot of bots) {
            const identity = await bot.start(runtime);
            started.push(bot);
            await runtime.markStarted(bot.platform, identity, bot.getPublicLink(identity));
        }
    } catch (error) {
        await Promise.allSettled(started.map((bot) => bot.stop()));
        await httpServer.stop();
        throw error;
    }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (stopping) {
        return;
    }
    stopping = true;
    global.logger.info(`Received ${signal}, stopping...`);
    try {
        await Promise.all(bots.map((bot) => bot.stop()));
        await httpServer.stop();
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
