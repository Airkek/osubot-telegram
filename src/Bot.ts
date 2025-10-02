import { Bot as TelegramBot, GrammyError, HttpError, webhookCallback } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { chatMemberFilter } from "@grammyjs/chat-members";
import { run, RunnerHandle } from "@grammyjs/runner";
import { UserFromGetMe } from "@grammyjs/types";
import { hydrateFiles } from "@grammyjs/files";
import { limit } from "@grammyjs/ratelimiter";
import { I18n } from "@grammyjs/i18n";
import express, { Request, Response } from "express";
import * as promClient from "prom-client";
import { Module } from "./telegram_event_handlers/modules/Module";
import Database from "./data/Database";
import { APICollection } from "./api/APICollection";
import { Templates, ITemplates } from "./telegram_event_handlers/templates";
import Maps from "./Maps";
import Admin from "./telegram_event_handlers/modules/Admin";
import Main from "./telegram_event_handlers/modules/Main";
import Akatsuki from "./telegram_event_handlers/modules/Akatsuki";
import AkatsukiRelax from "./telegram_event_handlers/modules/AkatsukiRelax";
import AkatsukiAutoPilot from "./telegram_event_handlers/modules/AkatsukiAutoPilot";
import Bancho from "./telegram_event_handlers/modules/Bancho";
import Gatari from "./telegram_event_handlers/modules/Gatari";
import Ripple from "./telegram_event_handlers/modules/Ripple";
import BeatLeader from "./telegram_event_handlers/modules/BeatLeader";
import ScoreSaber from "./telegram_event_handlers/modules/ScoreSaber";
import OsuTrackAPI from "./osu_specific/OsuTrackAPI";
import IgnoreList from "./Ignore";
import UnifiedMessageContext, { TgApi, TgContext } from "./TelegramSupport";
import { OsuBeatmapProvider } from "./beatmaps/osu/OsuBeatmapProvider";
import BanchoAPIV2 from "./api/BanchoV2";
import { SimpleCommandsModule } from "./telegram_event_handlers/modules/simple_commands";
import Util from "./Util";
import { OkiCardsGenerator } from "./oki-cards/OkiCardsGenerator";
import RippleRelax from "./telegram_event_handlers/modules/RippleRelax";
import { setInterval, clearInterval } from "node:timers";
import { PACKAGE_VERSION } from "./version";
import path from "path";
import { ReplyUtils } from "./telegram_event_handlers/utils/ReplyUtils";
import { Command } from "./telegram_event_handlers/Command";

export interface IBotConfig {
    tg: {
        token: string;
        owner: number;
    };
    tokens: {
        bancho_v2_app_id: number;
        bancho_v2_secret: string;
    };
}

type ShouldRemoveCallback = boolean;
export type PendingCallback = (ctx: UnifiedMessageContext) => Promise<ShouldRemoveCallback>;

export class Bot {
    public readonly config: IBotConfig;
    public readonly tg: TelegramBot;
    public readonly database: Database; // TODO: make private
    public readonly api: APICollection;
    public readonly osuBeatmapProvider: OsuBeatmapProvider; // TODO: move somewhere out of there
    public readonly templates: ITemplates = Templates;
    public readonly maps: Maps;
    public readonly ignored: IgnoreList;
    public readonly track: OsuTrackAPI;

    public readonly banchoApi: BanchoAPIV2; // TODO: make private

    public readonly okiChanCards: OkiCardsGenerator = new OkiCardsGenerator();

    public readonly replyUtils: ReplyUtils;

    private readonly pendingCallbacks: { [id: string]: PendingCallback } = {};

    public modules: Module[] = [];
    public startTime: number = 0;
    private totalMessages: number = 0;
    public me: UserFromGetMe;
    public readonly version: string;

    public readonly useLocalApi = process.env.TELEGRAM_USE_LOCAL_API === "true";

    private readonly useWebhooks = process.env.USE_WEBHOOKS === "true";

    private handle: RunnerHandle;
    private expressApp: express;

    private _initializationPromise: Promise<void>;

    constructor(config: IBotConfig) {
        this.config = config;
        global.logger.info("Set owner id: ", config.tg.owner);

        const apiRoot = this.useLocalApi ? process.env.TELEGRAM_LOCAL_API_HOST : undefined;
        this.tg = new TelegramBot<TgContext, TgApi>(config.tg.token, {
            client: {
                apiRoot,
            },
        });
        this.database = new Database(this.tg, config.tg.owner);
        this.ignored = new IgnoreList(this.database);

        this.banchoApi = new BanchoAPIV2(this);
        this.osuBeatmapProvider = new OsuBeatmapProvider(this.banchoApi, this.database.osuBeatmapMeta);

        this.api = new APICollection(this.banchoApi, this.osuBeatmapProvider);
        this.maps = new Maps();
        this.track = new OsuTrackAPI();

        this.version = PACKAGE_VERSION;

        this.replyUtils = new ReplyUtils(this.okiChanCards, this.templates, this.database.covers);

        this._initializationPromise = this.initialize();
    }

    private buildContext(ctx: TgContext): UnifiedMessageContext {
        return new UnifiedMessageContext(ctx, this.config.tg.owner, this.me, this.useLocalApi, this.database);
    }

    private async initialize(): Promise<void> {
        await this.setupDatabase();
        this.registerModules();
        this.setupBot();
        this.setupErrorHandling();
        this.configureCommandAliases();
        this.setupEventHandlers();
    }

    private async setupDatabase(): Promise<void> {
        await this.database.init();
        await this.ignored.init();
    }

    private registerModules(): void {
        this.modules = [
            new Bancho(this),
            new Gatari(this),
            new Ripple(this),
            new RippleRelax(this),
            new Akatsuki(this),
            new AkatsukiRelax(this),
            new AkatsukiAutoPilot(this),
            new BeatLeader(this),
            new ScoreSaber(this),
            new Admin(this),
            new Main(this),
            new SimpleCommandsModule(this),
        ];
    }

    private setupBot(): void {
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
                    const ctx = this.buildContext(tgCtx);
                    await ctx.activateLocalisator();
                    await this.database.statsModel.logMessage(ctx);
                    if (ctx.messagePayload) {
                        await ctx.answer(ctx.tr("too-fast-notification"));
                        await tgCtx.answerCallbackQuery();
                    } else {
                        await ctx.reply(ctx.tr("too-fast-commands-text"));
                    }
                },
                keyGenerator: (tgCtx: TgContext) => {
                    const ctx = this.buildContext(tgCtx);

                    let isCommand = !!this.pendingCallbacks[this.createCallbackTicket(ctx)];

                    if (!isCommand) {
                        for (const module of this.modules) {
                            const match = module.checkContext(ctx);
                            if (match) {
                                isCommand = true;
                                break;
                            }
                        }
                    }

                    let ticket = "command";
                    if (!isCommand) {
                        ticket = `${Date.now()}:${Math.random()}:${this.totalMessages}`;
                    }
                    return `${ctx.senderId}:${ticket}`;
                },
            })
        );
        this.tg.api.config.use(hydrateFiles(this.tg.token));
    }

    private setupErrorHandling(): void {
        this.tg.catch((err) => {
            const ctx = err.ctx;
            console.error(`Error handling update ${ctx.update.update_id}:`);

            if (err.error instanceof GrammyError) {
                console.error("Telegram API error:", err.error.description);
            } else if (err.error instanceof HttpError) {
                console.error("HTTP error:", err.error);
            } else {
                console.error("Unexpected error:", err.error);
            }
        });

        this.tg.api.config.use(autoRetry());
    }

    private setupEventHandlers(): void {
        const groups = this.tg.chatType(["group", "supergroup"]);
        groups.filter(chatMemberFilter("out", "in"), this.handleNewChatMember);
        groups.filter(chatMemberFilter("in", "out"), this.handleLeftChatMember);

        groups.on("message:new_chat_members", this.handleNewChatMembers);

        this.tg.on("callback_query:data", this.handleCallbackQuery);
        this.tg.on("message", this.handleMessage);
    }

    private handleNewChatMember = async (ctx): Promise<void> => {
        const {
            new_chat_member: { user },
        } = ctx.chatMember;
        const inChat = await this.database.chats.isUserInChat(user.id, ctx.chat.id);
        if (!inChat) {
            await this.database.chats.userJoined(user.id, ctx.chat.id);
        }
    };

    private handleLeftChatMember = async (ctx): Promise<void> => {
        const {
            new_chat_member: { user },
        } = ctx.chatMember;
        await this.database.chats.userLeft(user.id, ctx.chat.id);
    };

    private handleNewChatMembers = async (ctx): Promise<void> => {
        for (const user of ctx.message.new_chat_members) {
            const inChat = await this.database.chats.isUserInChat(user.id, ctx.chat.id);
            if (!inChat) {
                await this.database.chats.userJoined(user.id, ctx.chat.id);
            }
        }
    };

    private handleCallbackQuery = async (ctx): Promise<void> => {
        const context = this.buildContext(ctx);
        await this.database.statsModel.logMessage(context);
        if (await this.processCommands(context)) {
            await ctx.answerCallbackQuery();
        }
    };

    private readonly okiChanAliases: Record<string, string> = {
        "o!me": "s u",
        "osu!me": "s u",
        "o!get": "s u",
        "osu!get": "s u",
        "o!u": "s u",
        "osu!u": "s u",
        "o!user": "s u",
        "osu!user": "s u",
        "o!best": "s t",
        "osu!best": "s t",
        "o!last": "s r",
        "osu!last": "s r",
        "o!settings": "osu s",
        "osu!settings": "osu s",
        "o!set": "osu s",
        "osu!set": "osu s",
        "o!help": "osu help",
        "osu!help": "osu help",
        "o!link": "s n",
        "osu!link": "s n",
    };

    private handleMessage = async (ctx): Promise<void> => {
        if (this.shouldSkipMessage(ctx)) {
            return;
        }

        const context = this.buildContext(ctx);

        if (await context.checkFeature("plaintext-overrides")) {
            context.applyTextOverrides(this.okiChanAliases);
        }

        this.totalMessages++;
        await this.database.statsModel.logMessage(context);

        const ticket = this.createCallbackTicket(context);
        const cb = this.pendingCallbacks[ticket];
        if (cb) {
            let res: ShouldRemoveCallback = false;
            await context.activateLocalisator();
            try {
                res = await cb(context);
            } catch (e: unknown) {
                res = true;
                const err = await this.database.errors.addError(context, e);

                let errorText: string;
                if (e instanceof Error) {
                    errorText = e.message;
                } else if (e instanceof String) {
                    errorText = String(e);
                }

                await context.reply(`${Util.error(errorText, context)} (${err})`);
            } finally {
                if (res) {
                    this.removeCallback(ticket);
                }
            }
            return;
        }

        await this.processCommands(context);
    };

    private shouldSkipMessage(ctx: TgContext): boolean {
        return ctx.from.is_bot || this.ignored.isIgnored(ctx.from.id);
    }

    private async processOnboardings(ctx: UnifiedMessageContext): Promise<boolean> {
        if (!(await ctx.checkFeature("force-onboarding"))) {
            return false;
        }

        if (!(await this.database.onboardingModel.isUserNeedOnboarding(ctx.senderId))) {
            return false;
        }

        let onboardingCommand: Command = undefined;
        for (const module of this.modules) {
            if (module.name != "Main") {
                continue;
            }

            for (const cmd of module.commands) {
                if (cmd.name == "onboarding") {
                    onboardingCommand = cmd;
                    break;
                }
            }
        }

        await onboardingCommand.process(ctx);
        return true;
    }

    private async processCommands(ctx: UnifiedMessageContext): Promise<boolean> {
        for (const module of this.modules) {
            const match = module.checkContext(ctx);
            if (!match) {
                continue;
            }

            if (await this.processOnboardings(ctx)) {
                return;
            }

            if (ctx.isInGroupChat) {
                const inChat = await this.database.chats.isUserInChat(ctx.senderId, ctx.chatId);
                if (!inChat) {
                    await this.database.chats.userJoined(ctx.senderId, ctx.chatId);
                }
            }

            if (match.map) {
                const chatMap = this.maps.getChat(ctx.chatId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.maps.setMap(ctx.chatId, beatmap);
                }
            }

            await match.command.process(ctx);
            return true;
        }

        return false;
    }

    private configureCommandAliases(): void {
        const aliases: Record<string, string> = {
            start: "osu onboarding",
            help: "osu help",
            settings: "osu settings",
            user: "s u",
            recent: "s r",
            top_scores: "s t",
            chat_leaderboard: "s chat -std",
            chat_leaderboard_mania: "s chat -mania",
            chat_leaderboard_taiko: "s chat -taiko",
            chat_leaderboard_fruits: "s chat -ctb",
        };

        Object.entries(aliases).forEach(([command, alias]) => {
            this.tg.command(command, async (ctx) => {
                const realCommand = ctx.message.text.split(/\s+/)[0];
                const realAlias = {};
                realAlias[realCommand] = alias;

                const unifiedCtx = this.buildContext(ctx as TgContext);
                unifiedCtx.applyTextOverrides(realAlias);

                await this.database.statsModel.logMessage(unifiedCtx);
                await this.processCommands(unifiedCtx);
            });
        });
    }

    private initHealthCheck() {
        this.ensureExpressAppCreated();

        this.expressApp.get("/health", (req: Request, res: Response) => {
            const healthStatus = {
                status: "UP",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                message: "Service is running",
            };
            return res.status(200).json(healthStatus);
        });
    }

    private initPrometheusMetrics() {
        this.ensureExpressAppCreated();

        promClient.collectDefaultMetrics();

        this.expressApp.get("/metrics", async (req: Request, res: Response) => {
            try {
                res.setHeader("Content-Type", promClient.register.contentType);
                const metrics = await promClient.register.metrics();
                res.status(200).send(metrics);
            } catch (err) {
                res.status(500).send(err instanceof Error ? err.message : String(err));
            }
        });
    }

    private ensureExpressAppCreated() {
        if (!this.expressApp) {
            this.expressApp = express();
            this.expressApp.use(express.json());
        }
    }

    private listenExpressAppIfNeeded() {
        if (!this.expressApp) {
            return;
        }

        const port = Number(process.env.APP_PORT);
        this.expressApp.listen(port, () => {
            global.logger.info(`Listening on ${port}`);
        });
    }

    public async start(): Promise<void> {
        if (this._initializationPromise) {
            await this._initializationPromise;
        }
        await this.banchoApi.login();
        this.startTime = Date.now();

        this.me = await this.tg.api.getMe();

        if (this.useWebhooks) {
            this.ensureExpressAppCreated();
            this.expressApp.use(webhookCallback(this.tg, "express"));

            const endpoint = process.env.WEBHOOK_ENDPOINT;
            await this.tg.api.setWebhook(endpoint, {
                drop_pending_updates: process.env.IGNORE_OLD_UPDATES === "true",
                allowed_updates: ["chat_member", "callback_query", "message"],
            });
        } else {
            await this.tg.api.deleteWebhook({
                drop_pending_updates: process.env.IGNORE_OLD_UPDATES === "true",
            });

            this.handle = run(this.tg, {
                runner: {
                    fetch: {
                        allowed_updates: ["chat_member", "callback_query", "message"],
                    },
                },
            });
        }
        await this.database.statsModel.logStartup(this.me);
        await this.startStatsLogger();

        this.initHealthCheck();
        this.initPrometheusMetrics();
        this.listenExpressAppIfNeeded();

        global.logger.info(`Bot started as @${this.me.username} (${this.me.first_name})`);
    }

    private async logStatsInfo() {
        global.logger.info("Logging stats");
        await this.database.statsModel.logUserCount();
        await this.database.statsModel.logChatCount();
        await this.database.statsModel.logBeatmapMetadataCacheCount();
        await this.database.statsModel.logBeatmapFilesCount();
        await global.logger.info("Stats logged");
    }

    private statsInterval: NodeJS.Timeout = undefined;
    private async startStatsLogger() {
        this.stopStatsLogger();
        await this.logStatsInfo();
        this.statsInterval = setInterval(
            () => {
                this.logStatsInfo();
            },
            15 * 60 * 1000
        );
    }
    private stopStatsLogger() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = undefined;
        }
    }

    public async stop(): Promise<void> {
        if (this.useWebhooks) {
            await this.tg.api.deleteWebhook();
        } else {
            await this.handle.stop();
        }
        clearInterval(this.statsInterval);
        global.logger.info("Bot stopped");
    }

    public addCallback(ctx: UnifiedMessageContext, callback: PendingCallback): string {
        const ticket = this.createCallbackTicket(ctx);
        this.pendingCallbacks[ticket] = callback;
        return ticket;
    }

    public removeCallback(ticket: string) {
        this.pendingCallbacks[ticket] = undefined;
    }

    private createCallbackTicket(ctx: UnifiedMessageContext): string {
        return `${ctx.senderId}_${ctx.chatId}`;
    }
}
