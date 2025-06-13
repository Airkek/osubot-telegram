import { Bot as TelegramBot, GrammyError, HttpError, webhookCallback } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { chatMemberFilter } from "@grammyjs/chat-members";
import { run, RunnerHandle } from "@grammyjs/runner";
import { UserFromGetMe } from "@grammyjs/types";
import { hydrateFiles } from "@grammyjs/files";
import { limit } from "@grammyjs/ratelimiter";
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
import Util from "./Util";

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
    public readonly database: Database;
    public readonly api: APICollection;
    public readonly osuBeatmapProvider: OsuBeatmapProvider; // TODO: move somewhere out of there
    public readonly templates: ITemplates = Templates;
    public readonly maps: Maps;
    public readonly ignored: IgnoreList;
    public readonly track: OsuTrackAPI;

    public readonly banchoApi: BanchoAPIV2; // TODO: make private

    private readonly pendingCallbacks: { [id: string]: PendingCallback } = {};

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

    private buildContext(ctx: TgContext): UnifiedMessageContext {
        return new UnifiedMessageContext(ctx, this.me, this.useLocalApi, this.database);
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

    private setupBot(): void {
        this.tg.use(
            limit({
                timeFrame: 5000,
                limit: 3,
                onLimitExceeded: async (tgCtx: TgContext) => {
                    const ctx = this.buildContext(tgCtx);
                    if (ctx.messagePayload) {
                        await ctx.answer("Подождите немного!");
                        await tgCtx.answerCallbackQuery();
                    } else {
                        await ctx.reply("Вы слишком часто используете команды.");
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

        for (const module of this.modules) {
            const match = module.checkContext(context);
            if (!match) {
                continue;
            }

            if (match.map) {
                const chatMap = this.maps.getChat(context.chatId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.maps.setMap(context.chatId, beatmap);
                }
            }

            await match.command.process(context);
            await ctx.answerCallbackQuery();
        }
    };

    private handleMessage = async (ctx): Promise<void> => {
        const context = this.buildContext(ctx);

        if (this.shouldSkipMessage(context)) {
            return;
        }

        const ticket = this.createCallbackTicket(context);
        const cb = this.pendingCallbacks[ticket];
        if (cb) {
            let res = false;
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

                await ctx.reply(`${Util.error(errorText)} (${err})`);
            } finally {
                if (res) {
                    this.pendingCallbacks[ticket] = undefined;
                }
            }
            return;
        }

        this.totalMessages++;
        await this.processRegularMessage(context);
    };

    private shouldSkipMessage(ctx: UnifiedMessageContext): boolean {
        return ctx.isFromBot || this.ignored.isIgnored(ctx.senderId);
    }

    private async processRegularMessage(ctx: UnifiedMessageContext): Promise<void> {
        for (const module of this.modules) {
            const match = module.checkContext(ctx);
            if (!match) {
                continue;
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
        }
    }

    private configureCommandAliases(): void {
        const aliases: Record<string, string> = {
            start: "osu help",
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
                const command = ctx.message.text.split(/\s+/)[0];
                const spl = ctx.message.text.replace(command, "").trim();
                ctx.message.text = alias;
                if (spl != "") {
                    ctx.message.text += " " + spl;
                }
                const context = this.buildContext(ctx as TgContext);
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
