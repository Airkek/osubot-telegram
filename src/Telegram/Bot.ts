import { Bot as TelegramBot, BotError, GrammyError, HttpError } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { chatMemberFilter } from "@grammyjs/chat-members";
import { run, RunnerHandle } from "@grammyjs/runner";
import { Update, UserFromGetMe } from "@grammyjs/types";
import { hydrateFiles } from "@grammyjs/files";
import { limit } from "@grammyjs/ratelimiter";
import { I18n } from "@grammyjs/i18n";
import express, { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { ApplicationRuntime, RuntimePlatformServices } from "../core/ApplicationRuntime";
import { TelegramMessageContext, TgApi, TgContext } from "./MessageContext";
import { TelegramCoversProvider } from "./CoversProvider";
import { WebhookUpdateDispatcher } from "./UpdateDispatcher";
import { createTelegramWebhookIngress } from "./WebhookIngress";
import { MediaReferenceCache } from "../core/ApplicationStorage";
import { ExternalId } from "../core/Identity";

const WEBHOOK_UPDATE_CONCURRENCY = 40;
const WEBHOOK_UPDATE_QUEUE_CAPACITY = 1000;

export interface TelegramBotConfig {
    token: string;
    owner: number;
}

export class TelegramBotAdapter implements RuntimePlatformServices {
    readonly platform = "telegram" as const;
    readonly tg: TelegramBot<TgContext, TgApi>;
    readonly useLocalApi = process.env.TELEGRAM_USE_LOCAL_API === "true";

    private readonly useWebhooks = process.env.USE_WEBHOOKS === "true";
    private readonly webhookSecret?: string;
    private webhookDispatcher?: WebhookUpdateDispatcher<Update>;
    private runner?: RunnerHandle;
    private expressApp?: Express;
    private me?: UserFromGetMe;
    private runtime: ApplicationRuntime;
    private transportConfigured = false;

    constructor(private readonly config: TelegramBotConfig) {
        global.logger.info("Set owner id: ", config.owner);

        if (this.useWebhooks) {
            const configuredSecret = process.env.WEBHOOK_SECRET_TOKEN;
            if (configuredSecret && !/^[A-Za-z0-9_-]{32,256}$/.test(configuredSecret)) {
                throw new Error("WEBHOOK_SECRET_TOKEN must contain 32-256 characters from A-Z, a-z, 0-9, _ and -");
            }
            this.webhookSecret = configuredSecret || randomBytes(32).toString("base64url");
            if (!configuredSecret) {
                global.logger.warn("WEBHOOK_SECRET_TOKEN is not set; generated an ephemeral webhook secret");
            }
        }

        const apiRoot = this.useLocalApi ? process.env.TELEGRAM_LOCAL_API_HOST : undefined;
        this.tg = new TelegramBot<TgContext, TgApi>(config.token, {
            client: { apiRoot },
        });
    }

    createCoversProvider(mediaReferences: MediaReferenceCache): TelegramCoversProvider {
        return new TelegramCoversProvider(mediaReferences, this.tg, this.config.owner);
    }

    async sendMessage(recipientId: ExternalId, text: string): Promise<void> {
        await this.tg.api.sendMessage(recipientId, text);
    }

    async start(runtime: ApplicationRuntime): Promise<UserFromGetMe> {
        this.runtime = runtime;
        this.configureTransport();

        await this.tg.init();
        this.me = this.tg.botInfo;

        if (this.useWebhooks) {
            await this.startWebhook();
        } else {
            await this.startPolling();
        }

        this.initHealthCheck();
        this.listenExpressAppIfNeeded();

        global.logger.info(`Bot started as @${this.me.username} (${this.me.first_name})`);
        return this.me;
    }

    async stop(): Promise<void> {
        if (this.useWebhooks) {
            await this.tg.api.deleteWebhook();
            await this.webhookDispatcher?.stop();
        } else {
            await this.runner?.stop();
        }
        global.logger.info("Bot stopped");
    }

    private configureTransport(): void {
        if (this.transportConfigured) {
            return;
        }
        this.transportConfigured = true;
        this.setupBotMiddleware();
        this.setupErrorHandling();
        this.configureCommandAliases();
        this.setupEventHandlers();
    }

    private buildContext(ctx: TgContext): TelegramMessageContext {
        return new TelegramMessageContext(ctx, this.config.owner, this.me, this.useLocalApi, this.runtime.storage);
    }

    private setupBotMiddleware(): void {
        const i18n = new I18n<TgContext>({
            defaultLocale: "en",
            useSession: false,
            directory: path.join("./src", "locales"),
            globalTranslationContext(ctx) {
                return {
                    first_name: ctx.from?.first_name ?? "",
                    last_name: ctx.from?.last_name ?? "",
                    user_mention: ctx.from.username ? `@${ctx.from.username}` : (ctx.from?.last_name ?? ""),
                };
            },
        });

        this.tg.use(i18n);
        this.tg.use(
            limit({
                timeFrame: 5000,
                limit: 3,
                onLimitExceeded: async (tgCtx: TgContext) => {
                    await this.runtime.handleRateLimit(this.buildContext(tgCtx));
                },
                keyGenerator: (tgCtx: TgContext) => this.runtime.getRateLimitKey(this.buildContext(tgCtx)),
            })
        );
        this.tg.api.config.use(hydrateFiles(this.tg.token));
    }

    private setupErrorHandling(): void {
        this.tg.catch(this.handleUpdateError);
        this.tg.api.config.use(autoRetry());
    }

    private handleUpdateError = (error: BotError<TgContext>): void => {
        global.logger.error(`Error handling update ${error.ctx.update.update_id}`);
        if (error.error instanceof GrammyError) {
            global.logger.error("Telegram API error", error.error.description);
        } else if (error.error instanceof HttpError) {
            global.logger.error("HTTP error", error.error);
        } else {
            global.logger.error("Unexpected error", error.error);
        }
    };

    private setupEventHandlers(): void {
        const groups = this.tg.chatType(["group", "supergroup"]);
        groups.filter(chatMemberFilter("out", "in"), async (ctx) => {
            await this.runtime.userJoined(ctx.chatMember.new_chat_member.user.id, ctx.chat.id);
        });
        groups.filter(chatMemberFilter("in", "out"), async (ctx) => {
            const user = ctx.chatMember.new_chat_member.user;
            await this.runtime.userLeft(user.id, ctx.chat.id, user.id === this.me?.id);
        });
        groups.on("message:new_chat_members", async (ctx) => {
            for (const user of ctx.message.new_chat_members) {
                await this.runtime.userJoined(user.id, ctx.chat.id);
            }
        });

        this.tg.on("callback_query:data", async (ctx) => {
            if (await this.runtime.handleCallbackQuery(this.buildContext(ctx))) {
                await ctx.answerCallbackQuery();
            }
        });
        this.tg.on("message", async (ctx) => {
            if (!ctx.from.is_bot) {
                await this.runtime.handleMessage(this.buildContext(ctx));
            }
        });
    }

    private configureCommandAliases(): void {
        for (const [command, alias] of Object.entries(this.runtime.commandAliases)) {
            this.tg.command(command, async (ctx) => {
                const sourceCommand = ctx.message.text.split(/\s+/)[0];
                await this.runtime.handleCommandAlias(this.buildContext(ctx as TgContext), sourceCommand, alias);
            });
        }
    }

    private async startWebhook(): Promise<void> {
        this.ensureExpressAppCreated();
        const endpoint = process.env.WEBHOOK_ENDPOINT;
        const webhookPath = new URL(endpoint).pathname || "/";
        this.webhookDispatcher = new WebhookUpdateDispatcher<Update>(
            async (update) => {
                await this.tg.handleUpdate(update);
            },
            async (error, update) => {
                if (error instanceof BotError) {
                    this.handleUpdateError(error as BotError<TgContext>);
                } else {
                    global.logger.error(`Failed to handle webhook update ${update.update_id}`, error);
                }
            },
            WEBHOOK_UPDATE_CONCURRENCY,
            WEBHOOK_UPDATE_QUEUE_CAPACITY
        );
        this.expressApp.post(
            webhookPath,
            createTelegramWebhookIngress(this.webhookSecret, (update) => this.webhookDispatcher.enqueue(update))
        );
        await this.tg.api.setWebhook(endpoint, {
            drop_pending_updates: process.env.IGNORE_OLD_UPDATES === "true",
            allowed_updates: ["chat_member", "callback_query", "message"],
            secret_token: this.webhookSecret,
            max_connections: 100,
        });
    }

    private async startPolling(): Promise<void> {
        await this.tg.api.deleteWebhook({
            drop_pending_updates: process.env.IGNORE_OLD_UPDATES === "true",
        });
        this.runner = run(this.tg, {
            runner: {
                fetch: {
                    allowed_updates: ["chat_member", "callback_query", "message"],
                },
            },
        });
    }

    private initHealthCheck(): void {
        this.ensureExpressAppCreated();
        this.expressApp.get("/health", (_req: Request, res: Response) => {
            return res.status(200).json({
                status: "UP",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                message: "Service is running",
            });
        });
    }

    private ensureExpressAppCreated(): void {
        if (!this.expressApp) {
            this.expressApp = express();
            this.expressApp.use(express.json());
        }
    }

    private listenExpressAppIfNeeded(): void {
        if (!this.expressApp) {
            return;
        }
        const port = Number(process.env.APP_PORT);
        const host = process.env.APP_HOST || "0.0.0.0";
        this.expressApp.listen(port, host, () => {
            global.logger.info(`Listening on ${host}:${port}`);
        });
    }
}
