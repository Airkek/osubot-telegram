import { IMessageContext } from "core/IMessageContext";
import { GameApiRegistry } from "games/GameApiRegistry";
import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";
import { OsuBeatmapProvider } from "games/osu/beatmaps/OsuBeatmapProvider";
import { IBotRuntime } from "core/IBotRuntime";
import { PendingCallback } from "core/PendingCallback";
import { IPlatformBotLink } from "core/IPlatformBotLink";
import { IMediaAttachmentProvider } from "core/IMediaAttachmentProvider";
import { IApplicationStorage } from "core/storage/IApplicationStorage";
import { IBotIdentity } from "core/storage/IBotIdentity";
import { isPlatformStorageHost } from "core/storage/isPlatformStorageHost";
import { IPlatformStorageHost } from "core/storage/IPlatformStorageHost";
import { Admin } from "commands/modules/admin/Admin";
import { Akatsuki } from "commands/modules/akatsuki/Akatsuki";
import { AkatsukiAutoPilot } from "commands/modules/akatsuki-autopilot/AkatsukiAutoPilot";
import { AkatsukiRelax } from "commands/modules/akatsuki-relax/AkatsukiRelax";
import { Bancho } from "commands/modules/bancho/Bancho";
import { BeatLeader } from "commands/modules/beatleader/BeatLeader";
import { Gatari } from "commands/modules/gatari/Gatari";
import { Main } from "commands/modules/main/Main";
import { Module } from "commands/Module";
import { Ripple } from "commands/modules/ripple/Ripple";
import { RippleRelax } from "commands/modules/ripple-relax/RippleRelax";
import { ScoreSaber } from "commands/modules/scoresaber/ScoreSaber";
import { SimpleCommandsModule } from "commands/modules/simple/SimpleCommandsModule";
import { ITemplateStorage } from "presentation/templates/ITemplateStorage";
import { LegacyTextTemplates } from "presentation/templates/legacy-text/LegacyTextTemplateStorage";
import { ReplyService } from "presentation/ReplyService";
import { IgnoreList } from "infrastructure/cache/IgnoreList";
import { ChatBeatmapCache } from "infrastructure/cache/ChatBeatmapCache";
import { LeaderboardCache } from "infrastructure/cache/LeaderboardCache";
import { OkiCardsGenerator } from "presentation/cards/OkiCardsGenerator";
import { OsuTrackClient } from "games/osu/osutrack/OsuTrackClient";
import { localizeError } from "core/errors/localizeError";
import { PACKAGE_VERSION } from "version";
import { clearInterval, setInterval } from "node:timers";
import { Command } from "commands/Command";
import { ExternalId } from "core/ExternalId";
import { Platform } from "core/Platform";
import { performanceClient } from "infrastructure/performance/PerformanceClient";
import { IRuntimeConfig } from "application/IRuntimeConfig";
import { IRuntimeDependencies } from "application/IRuntimeDependencies";
import { IRuntimePlatformServices } from "application/IRuntimePlatformServices";
import { ModuleBuilderFunc } from "application/ModuleBuilderFunc";

const DEFAULT_MODULE_BUILDERS: ModuleBuilderFunc[] = [
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

export class ApplicationRuntime implements IBotRuntime {
    readonly storage: IApplicationStorage;
    readonly api: GameApiRegistry;
    readonly osuBeatmapProvider: OsuBeatmapProvider;
    readonly templates: ITemplateStorage;
    readonly chatBeatmaps: ChatBeatmapCache;
    readonly ignored: IgnoreList;
    readonly leaderboards = new LeaderboardCache();
    readonly track: OsuTrackClient;
    readonly replies: ReplyService;
    readonly version: string;
    readonly modules: Module[] = [];
    readonly platformBotLinks: IPlatformBotLink[] = [];
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

    private readonly moduleBuilders: ModuleBuilderFunc[];
    private readonly pendingCallbacks = new Map<string, PendingCallback>();
    private readonly sendPlatformMessage: IRuntimeDependencies["sendMessage"];
    private readonly performanceClient?: IRuntimeDependencies["performanceClient"];
    private initializationPromise?: Promise<void>;
    private statsInterval?: NodeJS.Timeout;
    private stopped = false;
    private totalMessages = 0;

    constructor(dependencies: IRuntimeDependencies) {
        this.storage = dependencies.storage;
        this.api = dependencies.api;
        this.osuBeatmapProvider = dependencies.osuBeatmapProvider;
        this.templates = dependencies.templates;
        this.chatBeatmaps = dependencies.chatBeatmaps;
        this.ignored = dependencies.ignored;
        this.track = dependencies.track;
        this.replies = dependencies.replies;
        this.version = dependencies.version ?? PACKAGE_VERSION;
        this.moduleBuilders = dependencies.moduleBuilders ?? DEFAULT_MODULE_BUILDERS;
        this.sendPlatformMessage = dependencies.sendMessage;
        this.performanceClient = dependencies.performanceClient;
    }

    static create(
        config: IRuntimeConfig,
        storage: IPlatformStorageHost,
        platforms: IRuntimePlatformServices[]
    ): ApplicationRuntime {
        if (platforms.length === 0) {
            throw new Error("At least one platform adapter is required");
        }
        const platformServices = new Map<Platform, IRuntimePlatformServices>();
        const mediaProviders = new Map<Platform, IMediaAttachmentProvider>();
        for (const platform of platforms) {
            if (platformServices.has(platform.platform)) {
                throw new Error(`Duplicate platform adapter '${platform.platform}'`);
            }
            platformServices.set(platform.platform, platform);
            mediaProviders.set(
                platform.platform,
                platform.createMediaAttachmentProvider(storage.forPlatform(platform.platform).mediaReferences)
            );
        }

        const currentPlatform = (): IRuntimePlatformServices => {
            const platform = platformServices.get(storage.currentPlatform);
            if (!platform) {
                throw new Error(`Platform adapter '${storage.currentPlatform}' is not configured`);
            }
            return platform;
        };
        const currentMediaProvider = (): IMediaAttachmentProvider => {
            const provider = mediaProviders.get(storage.currentPlatform);
            if (!provider) {
                throw new Error(`Media attachment provider '${storage.currentPlatform}' is not configured`);
            }
            return provider;
        };
        const mediaProvider: IMediaAttachmentProvider = {
            addPhotoDoc: (url) => currentMediaProvider().addPhotoDoc(url),
            getPhotoDoc: (url) => currentMediaProvider().getPhotoDoc(url),
        };
        const banchoApi = new BanchoV2ApiClient(config.banchoAppId, config.banchoClientSecret);
        const osuBeatmapProvider = new OsuBeatmapProvider(banchoApi, storage.beatmaps);
        const cards = new OkiCardsGenerator();

        return new ApplicationRuntime({
            storage,
            api: new GameApiRegistry(banchoApi),
            osuBeatmapProvider,
            templates: LegacyTextTemplates,
            chatBeatmaps: new ChatBeatmapCache(),
            ignored: new IgnoreList(storage.ignoredUsers),
            track: new OsuTrackClient(),
            replies: new ReplyService(cards, LegacyTextTemplates, mediaProvider),
            sendMessage: (recipientId, text) => currentPlatform().sendMessage(recipientId, text),
            performanceClient,
        });
    }

    async initialize(): Promise<void> {
        this.initializationPromise ??= this.initializeInternal();
        await this.initializationPromise;
    }

    private async initializeInternal(): Promise<void> {
        await this.storage.initialize();
        await this.ignored.init();
        await this.api.bancho.login();
        await this.performanceClient?.health();
        this.modules.push(...this.moduleBuilders.map((builder) => builder(this)));
    }

    async markStarted(platform: Platform, identity: IBotIdentity, publicLink: string): Promise<void> {
        const existingLink = this.platformBotLinks.findIndex((entry) => entry.platform === platform);
        const link = { platform, url: publicLink };
        if (existingLink === -1) {
            this.platformBotLinks.push(link);
        } else {
            this.platformBotLinks[existingLink] = link;
        }
        await this.runWithPlatform(platform, async () => {
            await this.storage.telemetry.logStartup(identity);
        });
        if (this.startTime === 0) {
            this.startTime = Date.now();
            await this.startStatsLogger();
        }
    }

    async stop(): Promise<void> {
        if (this.stopped) {
            return;
        }
        this.stopped = true;
        this.stopStatsLogger();
        this.performanceClient?.close();
        await this.storage.close();
    }

    async handleMessage(ctx: IMessageContext): Promise<void> {
        await this.runWithPlatform(ctx.platform, () => this.handleMessageInPlatform(ctx));
    }

    private async handleMessageInPlatform(ctx: IMessageContext): Promise<void> {
        await this.prepareContext(ctx);
        if (this.ignored.isIgnored(ctx.senderId)) {
            return;
        }

        await ctx.ensureUserInfoUpdated();
        if (await ctx.checkFeature("plaintext-overrides")) {
            ctx.applyTextOverrides(this.textAliases);
        }

        this.totalMessages++;
        await this.storage.telemetry.logMessage(ctx);

        const ticket = this.createCallbackTicket(ctx);
        const callback = this.pendingCallbacks.get(ticket);
        if (callback) {
            await this.processCallback(ctx, ticket, callback);
            return;
        }

        await this.processCommands(ctx);
    }

    async handleCallbackQuery(ctx: IMessageContext): Promise<boolean> {
        return await this.runWithPlatform(ctx.platform, () => this.handleCallbackQueryInPlatform(ctx));
    }

    private async handleCallbackQueryInPlatform(ctx: IMessageContext): Promise<boolean> {
        await this.prepareContext(ctx);
        await ctx.ensureUserInfoUpdated();
        await this.storage.telemetry.logMessage(ctx);
        return await this.processCommands(ctx);
    }

    async handleCommandAlias(ctx: IMessageContext, sourceCommand: string, alias: string): Promise<void> {
        await this.runWithPlatform(ctx.platform, () => this.handleCommandAliasInPlatform(ctx, sourceCommand, alias));
    }

    private async handleCommandAliasInPlatform(
        ctx: IMessageContext,
        sourceCommand: string,
        alias: string
    ): Promise<void> {
        await this.prepareContext(ctx);
        await ctx.ensureUserInfoUpdated();
        ctx.applyTextOverrides({ [sourceCommand]: alias });
        await this.storage.telemetry.logMessage(ctx);
        await this.processCommands(ctx);
    }

    async handleRateLimit(ctx: IMessageContext): Promise<void> {
        await this.runWithPlatform(ctx.platform, () => this.handleRateLimitInPlatform(ctx));
    }

    private async handleRateLimitInPlatform(ctx: IMessageContext): Promise<void> {
        await this.prepareContext(ctx);
        await ctx.ensureUserInfoUpdated();
        await ctx.activateLocalizer();
        await this.storage.telemetry.logMessage(ctx);
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
        return `${ctx.platform}:${ctx.externalSenderId}:${ticket}`;
    }

    async userJoined(platform: Platform, externalUserId: ExternalId, externalChatId: ExternalId): Promise<void> {
        await this.runWithPlatform(platform, () => this.userJoinedInPlatform(externalUserId, externalChatId));
    }

    private async userJoinedInPlatform(externalUserId: ExternalId, externalChatId: ExternalId): Promise<void> {
        const [user, chat] = await Promise.all([
            this.storage.identities.resolveUser(externalUserId),
            this.storage.identities.resolveChat(externalChatId),
        ]);
        if (!(await this.storage.memberships.isUserInChat(user.accountId, chat.chatId))) {
            await this.storage.memberships.userJoined(user.accountId, chat.chatId);
        }
    }

    async userLeft(
        platform: Platform,
        externalUserId: ExternalId,
        externalChatId: ExternalId,
        isCurrentBot: boolean
    ): Promise<void> {
        await this.runWithPlatform(platform, () =>
            this.userLeftInPlatform(externalUserId, externalChatId, isCurrentBot)
        );
    }

    private async userLeftInPlatform(
        externalUserId: ExternalId,
        externalChatId: ExternalId,
        isCurrentBot: boolean
    ): Promise<void> {
        const chat = await this.storage.identities.resolveChat(externalChatId);
        if (isCurrentBot) {
            this.chatBeatmaps.removeChat(chat.chatId);
            return;
        }
        const user = await this.storage.identities.resolveUser(externalUserId);
        await this.storage.memberships.userLeft(user.accountId, chat.chatId);
    }

    addCallback(ctx: IMessageContext, callback: PendingCallback): string {
        const ticket = this.createCallbackTicket(ctx);
        this.pendingCallbacks.set(ticket, callback);
        return ticket;
    }

    removeCallback(ticket: string): void {
        this.pendingCallbacks.delete(ticket);
    }

    async sendMessage(recipientId: ExternalId, text: string): Promise<void> {
        await this.sendPlatformMessage(recipientId, text);
    }

    private async prepareContext(ctx: IMessageContext): Promise<void> {
        const [user, chat, replyUser] = await Promise.all([
            this.storage.identities.resolveUser(ctx.externalSenderId),
            this.storage.identities.resolveChat(ctx.externalChatId),
            ctx.replyMessage
                ? this.storage.identities.resolveUser(ctx.replyMessage.externalSenderId)
                : Promise.resolve(undefined),
        ]);
        ctx.bindIdentity({ user, chat, replyUser });
    }

    private async processCallback(ctx: IMessageContext, ticket: string, callback: PendingCallback): Promise<void> {
        let shouldRemove = false;
        await ctx.activateLocalizer();
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
            errorId = await this.storage.errors.addError(ctx, error);
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
        if (!(await this.storage.onboarding.isUserNeedOnboarding(ctx.senderId))) {
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

            if (match.command.name !== "account" && (await this.processOnboardings(ctx))) {
                return true;
            }

            if (ctx.isInGroupChat) {
                if (!(await this.storage.memberships.isUserInChat(ctx.senderId, ctx.chatId))) {
                    await this.storage.memberships.userJoined(ctx.senderId, ctx.chatId);
                }
            }

            if (match.map) {
                const chatMap = this.chatBeatmaps.getChat(ctx.chatId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.chatBeatmaps.setMap(ctx.chatId, beatmap);
                }
            }

            await match.command.process(ctx);
            return true;
        }
        return false;
    }

    private createCallbackTicket(ctx: IMessageContext): string {
        return `${ctx.platform}:${ctx.externalSenderId}_${ctx.externalChatId}`;
    }

    private async logStatsInfo(): Promise<void> {
        global.logger.info("Logging stats");
        const platforms = isPlatformStorageHost(this.storage) ? this.storage.platforms : [this.storage.platform];
        for (const platform of platforms) {
            await this.runWithPlatform(platform, async () => {
                await this.storage.telemetry.logUserCount();
                await this.storage.telemetry.logChatCount();
                await this.storage.telemetry.logBeatmapMetadataCacheCount();
            });
        }
        global.logger.info("Stats logged");
    }

    private async runWithPlatform<T>(platform: Platform, callback: () => Promise<T>): Promise<T> {
        if (isPlatformStorageHost(this.storage)) {
            return await this.storage.runWithPlatform(platform, callback);
        }
        if (this.storage.platform !== platform) {
            throw new Error(`Storage platform '${this.storage.platform}' cannot handle '${platform}' context`);
        }
        return await callback();
    }

    private async startStatsLogger(): Promise<void> {
        this.stopStatsLogger();
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

    private stopStatsLogger(): void {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = undefined;
        }
    }
}
