import { Bot as TelegramBot, GrammyError, HttpError, webhookCallback } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { chatMemberFilter } from "@grammyjs/chat-members";
import { run, RunnerHandle } from "@grammyjs/runner";
import { UserFromGetMe } from "@grammyjs/types";
import { hydrateFiles } from "@grammyjs/files";
import express from "express";
import { Module } from "./telegram_event_handlers/modules/Module";
import Database from "./Database";
import { APICollection } from "./api/APICollection";
import { Templates, ITemplates } from "./telegram_event_handlers/templates";
import Maps from "./Maps";
import Admin from "./telegram_event_handlers/modules/Admin";
import Main from "./telegram_event_handlers/modules/Main";
import Akatsuki from "./telegram_event_handlers/modules/Akatsuki";
import AkatsukiRelax from "./telegram_event_handlers/modules/AkatsukiRelax";
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

export class Bot {
    public readonly config: IBotConfig;
    public readonly tg: TelegramBot;
    public readonly database: Database;
    public readonly api: APICollection;
    public readonly osuBeatmapProvider: OsuBeatmapProvider; // TODO: move somewhere out of there
    public readonly templates: ITemplates = Templates;
    public readonly maps: Maps;
    public readonly ignored: IgnoreList;
    public readonly track: OsuTrackAPI;

    public readonly banchoApi: BanchoAPIV2; // TODO: make private

    public modules: Module[] = [];
    public startTime: number = 0;
    public totalMessages: number = 0;
    public me: UserFromGetMe;
    public readonly version: string;

    public readonly useLocalApi = process.env.TELEGRAM_USE_LOCAL_API === "true";

    private readonly useWebhooks = process.env.USE_WEBHOOKS === "true";

    private handle: RunnerHandle;
    private app: express;

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

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.version = require("../../package.json").version;

        this.initialize();
    }

    private initialize(): void {
        this.setupDatabase();
        this.registerModules();
        this.setupBot();
        this.setupErrorHandling();
        this.configureCommandAliases();
        this.setupEventHandlers();
    }

    private setupDatabase(): void {
        this.database.init().then(() => this.ignored.init());
    }

    private registerModules(): void {
        this.modules = [
            new Bancho(this),
            new Gatari(this),
            new Ripple(this),
            new Akatsuki(this),
            new AkatsukiRelax(this),
            new BeatLeader(this),
            new ScoreSaber(this),
            new Admin(this),
            new Main(this),
            new SimpleCommandsModule(this),
        ];
    }

    private setupBot(): void {}

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
        this.tg.api.config.use(hydrateFiles(this.tg.token));
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
        const context = new UnifiedMessageContext(ctx, this.tg, this.me);

        for (const module of this.modules) {
            const match = module.checkContext(context);
            if (!match) {
                continue;
            }

            if (match.map) {
                const chatMap = this.maps.getChat(context.peerId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.maps.setMap(context.peerId, beatmap);
                }
            }

            await match.command.process(context);
            await ctx.answerCallbackQuery();
        }
    };

    private handleMessage = async (ctx): Promise<void> => {
        const context = new UnifiedMessageContext(ctx, this.tg, this.me);

        if (this.shouldSkipMessage(context)) {
            return;
        }

        this.totalMessages++;
        await this.processRegularMessage(context);
    };

    private shouldSkipMessage(ctx: UnifiedMessageContext): boolean {
        return ctx.isGroup || ctx.isFromGroup || ctx.isEvent || this.ignored.isIgnored(ctx.senderId);
    }

    private async processRegularMessage(ctx: UnifiedMessageContext): Promise<void> {
        for (const module of this.modules) {
            const match = module.checkContext(ctx);
            if (!match) {
                continue;
            }

            if (ctx.isChat) {
                const inChat = await this.database.chats.isUserInChat(ctx.senderId, ctx.chatId);
                if (!inChat) {
                    await this.database.chats.userJoined(ctx.senderId, ctx.chatId);
                }
            }

            if (match.map) {
                const chatMap = this.maps.getChat(ctx.peerId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.maps.setMap(ctx.peerId, beatmap);
                }
            }

            await match.command.process(ctx);
        }
    }

    private configureCommandAliases(): void {
        const aliases: Record<string, string> = {
            start: "osu help",
            help: "osu help",
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
                ctx.message.text = alias;
                const context = new UnifiedMessageContext(ctx as TgContext, this.tg, this.me);
                for (const module of this.modules) {
                    const match = module.checkContext(context);
                    if (match) {
                        await match.command.process(context);
                    }
                }
            });
        });
    }

    public async start(): Promise<void> {
        await this.banchoApi.login();
        this.startTime = Date.now();

        this.me = await this.tg.api.getMe();

        if (this.useWebhooks) {
            this.app = express();
            this.app.use(express.json());
            this.app.use(webhookCallback(this.tg, "express"));

            const port = Number(process.env.APP_PORT);
            this.app.listen(port, function () {
                global.logger.info(`Bot webhooks listening on ${port}`);
            });

            const endpoint = process.env.WEBHOOK_ENDPOINT;
            await this.tg.api.setWebhook(endpoint, {
                drop_pending_updates: true,
                allowed_updates: ["chat_member", "callback_query", "message"],
            });
        } else {
            // drop updates
            await this.tg.api.deleteWebhook({
                drop_pending_updates: true,
            });

            this.handle = run(this.tg, {
                runner: {
                    fetch: {
                        allowed_updates: ["chat_member", "callback_query", "message"],
                    },
                },
            });
        }
        global.logger.info(`Bot started as @${this.me.username} (${this.me.first_name})`);
    }

    public async stop(): Promise<void> {
        if (this.useWebhooks) {
            await this.tg.api.deleteWebhook();
        } else {
            await this.handle.stop();
        }
        global.logger.info("Bot stopped");
    }
}
