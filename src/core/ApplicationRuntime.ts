import { APICollection } from "../api/APICollection";
import BanchoAPIV2 from "../api/BanchoV2";
import { OsuBeatmapProvider } from "../beatmaps/osu/OsuBeatmapProvider";
import { BotRuntime, PendingCallback } from "./BotRuntime";
import { CoversProvider } from "./CoversProvider";
import Database from "../data/Database";
import Admin from "../event_handlers/modules/Admin";
import Akatsuki from "../event_handlers/modules/Akatsuki";
import AkatsukiAutoPilot from "../event_handlers/modules/AkatsukiAutoPilot";
import AkatsukiRelax from "../event_handlers/modules/AkatsukiRelax";
import Bancho from "../event_handlers/modules/Bancho";
import BeatLeader from "../event_handlers/modules/BeatLeader";
import Gatari from "../event_handlers/modules/Gatari";
import Main from "../event_handlers/modules/Main";
import { Module } from "../event_handlers/modules/Module";
import Ripple from "../event_handlers/modules/Ripple";
import RippleRelax from "../event_handlers/modules/RippleRelax";
import ScoreSaber from "../event_handlers/modules/ScoreSaber";
import { SimpleCommandsModule } from "../event_handlers/modules/simple_commands";
import { Templates, ITemplates } from "../event_handlers/templates";
import { ReplyUtils } from "../event_handlers/utils/ReplyUtils";
import IgnoreList from "../Ignore";
import Maps from "../Maps";
import { IMessageContext } from "./MessageContext";
import { OkiCardsGenerator } from "../oki-cards/OkiCardsGenerator";
import OsuTrackAPI from "../osu_specific/OsuTrackAPI";
import { localizeError } from "../UserError";
import { PACKAGE_VERSION } from "../version";
import { clearInterval, setInterval } from "node:timers";
import { Command } from "../event_handlers/Command";

export interface RuntimeConfig {
    banchoAppId: number;
    banchoClientSecret: string;
}

export interface RuntimePlatformServices {
    createCoversProvider(database: Database): CoversProvider;
    sendMessage(recipientId: number, text: string): Promise<void>;
}

export type ModuleFactory = (runtime: BotRuntime) => Module;

export interface RuntimeDependencies {
    database: Database;
    api: APICollection;
    osuBeatmapProvider: OsuBeatmapProvider;
    templates: ITemplates;
    maps: Maps;
    ignored: IgnoreList;
    track: OsuTrackAPI;
    replyUtils: ReplyUtils;
    sendMessage(recipientId: number, text: string): Promise<void>;
    moduleFactories?: ModuleFactory[];
    version?: string;
}

interface BotIdentity {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
}

const DEFAULT_MODULE_FACTORIES: ModuleFactory[] = [
    (runtime) => new Bancho(runtime),
    (runtime) => new Gatari(runtime),
    (runtime) => new Ripple(runtime),
    (runtime) => new RippleRelax(runtime),
    (runtime) => new Akatsuki(runtime),
    (runtime) => new AkatsukiRelax(runtime),
    (runtime) => new AkatsukiAutoPilot(runtime),
    (runtime) => new BeatLeader(runtime),
    (runtime) => new ScoreSaber(runtime),
    (runtime) => new Admin(runtime),
    (runtime) => new Main(runtime),
    (runtime) => new SimpleCommandsModule(runtime),
];

export class ApplicationRuntime implements BotRuntime {
    readonly database: Database;
    readonly api: APICollection;
    readonly osuBeatmapProvider: OsuBeatmapProvider;
    readonly templates: ITemplates;
    readonly maps: Maps;
    readonly ignored: IgnoreList;
    readonly track: OsuTrackAPI;
    readonly replyUtils: ReplyUtils;
    readonly version: string;
    readonly modules: Module[] = [];
    startTime = 0;

    readonly commandAliases: Record<string, string> = {
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

    private readonly textAliases: Record<string, string> = {
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
        "o!link": "s link",
        "osu!link": "s link",
    };

    private readonly moduleFactories: ModuleFactory[];
    private readonly pendingCallbacks = new Map<string, PendingCallback>();
    private readonly sendPlatformMessage: RuntimeDependencies["sendMessage"];
    private initializationPromise?: Promise<void>;
    private statsInterval?: NodeJS.Timeout;
    private totalMessages = 0;

    constructor(dependencies: RuntimeDependencies) {
        this.database = dependencies.database;
        this.api = dependencies.api;
        this.osuBeatmapProvider = dependencies.osuBeatmapProvider;
        this.templates = dependencies.templates;
        this.maps = dependencies.maps;
        this.ignored = dependencies.ignored;
        this.track = dependencies.track;
        this.replyUtils = dependencies.replyUtils;
        this.version = dependencies.version ?? PACKAGE_VERSION;
        this.moduleFactories = dependencies.moduleFactories ?? DEFAULT_MODULE_FACTORIES;
        this.sendPlatformMessage = dependencies.sendMessage;
    }

    static create(config: RuntimeConfig, platform: RuntimePlatformServices): ApplicationRuntime {
        const database = new Database();
        const banchoApi = new BanchoAPIV2(config.banchoAppId, config.banchoClientSecret);
        const osuBeatmapProvider = new OsuBeatmapProvider(banchoApi, database.osuBeatmapMeta);
        const cards = new OkiCardsGenerator();

        return new ApplicationRuntime({
            database,
            api: new APICollection(banchoApi),
            osuBeatmapProvider,
            templates: Templates,
            maps: new Maps(),
            ignored: new IgnoreList(database),
            track: new OsuTrackAPI(),
            replyUtils: new ReplyUtils(cards, Templates, platform.createCoversProvider(database)),
            sendMessage: platform.sendMessage,
        });
    }

    async initialize(): Promise<void> {
        this.initializationPromise ??= this.initializeInternal();
        await this.initializationPromise;
    }

    private async initializeInternal(): Promise<void> {
        await this.database.init();
        await this.ignored.init();
        await this.api.bancho.login();
        this.modules.push(...this.moduleFactories.map((factory) => factory(this)));
    }

    async markStarted(identity: BotIdentity): Promise<void> {
        this.startTime = Date.now();
        await this.database.statsModel.logStartup(identity);
        await this.startStatsLogger();
    }

    async stop(): Promise<void> {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = undefined;
        }
    }

    async handleMessage(ctx: IMessageContext): Promise<void> {
        if (this.ignored.isIgnored(ctx.senderId)) {
            return;
        }

        await ctx.ensureUserInfoUpdated();
        if (await ctx.checkFeature("plaintext-overrides")) {
            ctx.applyTextOverrides(this.textAliases);
        }

        this.totalMessages++;
        await this.database.statsModel.logMessage(ctx);

        const ticket = this.createCallbackTicket(ctx);
        const callback = this.pendingCallbacks.get(ticket);
        if (callback) {
            await this.processCallback(ctx, ticket, callback);
            return;
        }

        await this.processCommands(ctx);
    }

    async handleCallbackQuery(ctx: IMessageContext): Promise<boolean> {
        await ctx.ensureUserInfoUpdated();
        await this.database.statsModel.logMessage(ctx);
        return await this.processCommands(ctx);
    }

    async handleCommandAlias(ctx: IMessageContext, sourceCommand: string, alias: string): Promise<void> {
        await ctx.ensureUserInfoUpdated();
        ctx.applyTextOverrides({ [sourceCommand]: alias });
        await this.database.statsModel.logMessage(ctx);
        await this.processCommands(ctx);
    }

    async handleRateLimit(ctx: IMessageContext): Promise<void> {
        await ctx.ensureUserInfoUpdated();
        await ctx.activateLocalisator();
        await this.database.statsModel.logMessage(ctx);
        if (ctx.messagePayload) {
            await ctx.answer(ctx.tr("too-fast-notification"));
        } else {
            await ctx.reply(ctx.tr("too-fast-commands-text"));
        }
    }

    getRateLimitKey(ctx: IMessageContext): string {
        const hasPendingCallback = this.pendingCallbacks.has(this.createCallbackTicket(ctx));
        const isCommand = hasPendingCallback || this.modules.some((module) => !!module.checkContext(ctx));
        const ticket = isCommand ? "command" : `${Date.now()}:${Math.random()}:${this.totalMessages}`;
        return `${ctx.senderId}:${ticket}`;
    }

    async userJoined(userId: number, chatId: number): Promise<void> {
        if (!(await this.database.chats.isUserInChat(userId, chatId))) {
            await this.database.chats.userJoined(userId, chatId);
        }
    }

    async userLeft(userId: number, chatId: number, isCurrentBot: boolean): Promise<void> {
        if (isCurrentBot) {
            this.maps.removeChat(chatId);
        }
        await this.database.chats.userLeft(userId, chatId);
    }

    addCallback(ctx: IMessageContext, callback: PendingCallback): string {
        const ticket = this.createCallbackTicket(ctx);
        this.pendingCallbacks.set(ticket, callback);
        return ticket;
    }

    removeCallback(ticket: string): void {
        this.pendingCallbacks.delete(ticket);
    }

    async sendMessage(recipientId: number, text: string): Promise<void> {
        await this.sendPlatformMessage(recipientId, text);
    }

    private async processCallback(ctx: IMessageContext, ticket: string, callback: PendingCallback): Promise<void> {
        let shouldRemove = false;
        await ctx.activateLocalisator();
        try {
            shouldRemove = await callback(ctx);
        } catch (error) {
            shouldRemove = true;
            await this.reportContextError(ctx, error, "callback");
        } finally {
            if (shouldRemove) {
                this.removeCallback(ticket);
            }
        }
    }

    private async reportContextError(ctx: IMessageContext, error: unknown, source: string): Promise<void> {
        let errorId: string;
        try {
            errorId = await this.database.errors.addError(ctx, error);
        } catch (recordError) {
            global.logger.error(`Failed to record ${source} error`, recordError, error);
        }

        try {
            const errorReference = errorId ? ` (${errorId})` : "";
            await ctx.reply(`${localizeError(error, ctx)}${errorReference}`);
        } catch (replyError) {
            global.logger.error(`Failed to send ${source} error response`, replyError);
        }
    }

    private async processOnboardings(ctx: IMessageContext): Promise<boolean> {
        if (!(await ctx.checkFeature("force-onboarding"))) {
            return false;
        }
        if (!(await this.database.onboardingModel.isUserNeedOnboarding(ctx.senderId))) {
            return false;
        }

        let onboardingCommand: Command;
        for (const module of this.modules) {
            if (module.name === "Main") {
                onboardingCommand = module.commands.find((command) => command.name === "onboarding");
                break;
            }
        }
        if (!onboardingCommand) {
            throw new Error("Onboarding command is not registered");
        }

        await onboardingCommand.process(ctx);
        return true;
    }

    private async processCommands(ctx: IMessageContext): Promise<boolean> {
        for (const module of this.modules) {
            const match = module.checkContext(ctx);
            if (!match) {
                continue;
            }

            if (await this.processOnboardings(ctx)) {
                return true;
            }

            if (ctx.isInGroupChat) {
                await this.userJoined(ctx.senderId, ctx.chatId);
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

    private createCallbackTicket(ctx: IMessageContext): string {
        return `${ctx.senderId}_${ctx.chatId}`;
    }

    private async logStatsInfo(): Promise<void> {
        global.logger.info("Logging stats");
        await this.database.statsModel.logUserCount();
        await this.database.statsModel.logChatCount();
        await this.database.statsModel.logBeatmapMetadataCacheCount();
        await this.database.statsModel.logBeatmapFilesCount();
        global.logger.info("Stats logged");
    }

    private async startStatsLogger(): Promise<void> {
        await this.stop();
        await this.logStatsInfo();
        this.statsInterval = setInterval(
            () => {
                void this.logStatsInfo().catch((error) => {
                    global.logger.error("Failed to log periodic stats", error);
                });
            },
            15 * 60 * 1000
        );
    }
}
