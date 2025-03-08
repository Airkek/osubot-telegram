import { Bot as TelegramBot, GrammyError, HttpError } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import axios from "axios";
import { Module } from "./Module";
import Database from "./Database";
import { APICollection } from "./API";
import { Templates, ITemplates } from "./templates";
import Maps from "./Maps";
import { ReplayParser } from "./Replay";
import Calculator from "./pp/bancho";
import Admin from "./modules/Admin";
import Main from "./modules/Main";
import Akatsuki from "./modules/Akatsuki";
import AkatsukiRelax from "./modules/AkatsukiRelax";
import Bancho from "./modules/Bancho";
import Gatari from "./modules/Gatari";
import Ripple from "./modules/Ripple";
import BeatLeader from "./modules/BeatLeader";
import ScoreSaber from "./modules/ScoreSaber";
import OsuTrackAPI from "./Track";
import Util from "./Util";
import IgnoreList from "./Ignore";
import UnifiedMessageContext from "./TelegramSupport";
import IsMap from "./regexes/MapRegexp";
import IsScore from "./regexes/ScoreRegexp";
import { OsuBeatmapProvider } from "./beatmaps/osu/OsuBeatmapProvider";

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

    public modules: Module[] = [];
    public disabled: number[] = [];
    public startTime: number = 0;
    public totalMessages: number = 0;
    public readonly version: string;

    constructor(config: IBotConfig) {
        this.config = config;
        global.logger.info("Set owner id: ", config.tg.owner);

        this.tg = new TelegramBot(config.tg.token);
        this.database = new Database(this.tg, config.tg.owner);
        this.ignored = new IgnoreList(this.database);
        this.api = new APICollection(this);
        this.osuBeatmapProvider = new OsuBeatmapProvider(this.api.v2, this.database.osuBeatmapMeta);
        this.maps = new Maps(this);
        this.track = new OsuTrackAPI();

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.version = require("../../package.json").version;

        this.initialize();
    }

    private initialize(): void {
        this.setupDatabase();
        this.registerModules();
        this.setupErrorHandling();
        this.setupEventHandlers();
        this.configureCommandAliases();
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
        ];
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
        this.tg.on("message:new_chat_members", this.handleNewChatMembers);
        this.tg.on("message:left_chat_member", this.handleLeftChatMember);

        this.tg.on("callback_query:data", this.handleCallbackQuery);

        this.tg.on("message", this.handleMessage);
    }

    private handleNewChatMembers = async (ctx): Promise<void> => {
        for (const user of ctx.message.new_chat_members) {
            this.database.chats.isUserInChat(user.id, ctx.chat.id).then(async (inChat: boolean) => {
                if (!inChat) {
                    await this.database.chats.userJoined(user.id, ctx.chat.id);
                }
            });
        }
    };

    private handleLeftChatMember = async (ctx): Promise<void> => {
        this.database.chats.userLeft(ctx.message.left_chat_member.id, ctx.chat.id);
    };

    private handleCallbackQuery = async (ctx): Promise<void> => {
        const context = new UnifiedMessageContext(ctx, this.tg);

        for (const module of this.modules) {
            const match = module.checkContext(context);
            if (!match) {
                continue;
            }

            if (this.disabled.includes(context.peerId) && match.command.disables) {
                ctx.answerCallbackQuery();
                return;
            }

            if (match.map) {
                const chatMap = this.maps.getChat(context.peerId);
                if (!chatMap || chatMap.map.id !== match.map) {
                    const beatmap = await this.osuBeatmapProvider.getBeatmapById(match.map);
                    this.maps.setMap(context.peerId, beatmap);
                }
            }

            match.command.process(context).then(async () => {
                await ctx.answerCallbackQuery();
            });
        }
    };

    private handleMessage = async (ctx): Promise<void> => {
        const context = new UnifiedMessageContext(ctx, this.tg);

        if (this.shouldSkipMessage(context)) return;

        this.totalMessages++;

        if (this.checkReplay(context)) {
            this.processReplay(context);
            return;
        }
        if (this.processScore(context)) return;
        if (this.processMap(context)) return;

        this.processRegularMessage(context);
    };

    private shouldSkipMessage(ctx: UnifiedMessageContext): boolean {
        return (
            ctx.isGroup ||
            ctx.isFromGroup ||
            ctx.isEvent ||
            this.ignored.isIgnored(ctx.senderId) ||
            this.disabled.includes(ctx.peerId)
        );
    }

    private async processReplay(ctx: UnifiedMessageContext): Promise<boolean> {
        const replayFile = await ctx.tgCtx.getFile();
        if (!replayFile?.file_path) return false;

        try {
            const { data: file } = await axios.get(
                `https://api.telegram.org/file/bot${this.tg.token}/${replayFile.file_path}`,
                { responseType: "arraybuffer" }
            );

            const replay = new ReplayParser(file).getReplay();
            const beatmap = await this.osuBeatmapProvider.getBeatmapByHash(replay.beatmapHash, replay.mode);
            await beatmap.applyMods(replay.mods);
            const cover = await this.database.covers.getCover(beatmap.setId);
            const calculator = new Calculator(beatmap, replay.mods);

            const keyboard = Util.createKeyboard(
                [
                    ["B", "s"],
                    ["G", "g"],
                    ["R", "r"],
                ].map((group) => [
                    { text: `[${group[0]}] Мой скор`, command: `${group[1]} c ${Util.getModeArg(replay.mode)}` },
                    ...(ctx.isChat
                        ? [
                              {
                                  text: `[${group[0]}] Топ чата`,
                                  command: `${group[1]} lb ${Util.getModeArg(replay.mode)}`,
                              },
                          ]
                        : []),
                ])
            );

            await ctx.reply(this.templates.Replay(replay, beatmap, calculator), {
                attachment: cover,
                keyboard,
            });

            this.maps.setMap(ctx.peerId, beatmap);
            return true;
        } catch (error) {
            global.logger.error(error);
            await ctx.reply("Ошибка обработки реплея!");
            return true;
        }
    }

    private processScore(ctx: UnifiedMessageContext): boolean {
        const scoreId = IsScore(ctx.text) || this.getScoreFromAttachments(ctx);
        if (!scoreId) return false;

        this.processScoreInternal(ctx, scoreId);
        return true;
    }

    private async processScoreInternal(ctx: UnifiedMessageContext, scoreId: number) {
        const score = await this.api.v2.getScoreByScoreId(scoreId);
        const map = await this.osuBeatmapProvider.getBeatmapById(score.beatmapId, score.mode);
        await map.applyMods(score.mods);
        const user = await this.api.v2.getUserById(score.player_id);
        const cover = await this.database.covers.getCover(map.setId);
        this.maps.setMap(ctx.peerId, map);
        const calc = new Calculator(map, score.mods);
        await ctx.reply(
            `Player: ${user.nickname}\n\n${this.templates.ScoreFull(score, map, calc, "https://osu.ppy.sh")}`,
            {
                attachment: cover,
            }
        );
    }

    private processMap(ctx: UnifiedMessageContext): boolean {
        const mapId = IsMap(ctx.text) || this.getMapFromAttachments(ctx);
        if (!mapId) return false;

        this.maps.sendMap(mapId, ctx);
        return true;
    }

    private async processRegularMessage(ctx: UnifiedMessageContext): Promise<void> {
        if (!ctx.hasText) return;

        if (ctx.text.toLowerCase().startsWith("map ")) {
            await this.maps.stats(ctx);
            return;
        }

        for (const module of this.modules) {
            const match = module.checkContext(ctx);
            if (!match) continue;

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
            chat_leaderboard: "s chat",
            chat_leaderboard_mania: "s chat -mania",
            chat_leaderboard_taiko: "s chat -taiko",
            chat_leaderboard_fruits: "s chat -ctb",
        };

        Object.entries(aliases).forEach(([command, alias]) => {
            this.tg.command(command, async (ctx) => {
                ctx.message.text = alias;
                const context = new UnifiedMessageContext(ctx, this.tg);
                for (const module of this.modules) {
                    const match = module.checkContext(context);
                    if (match) await match.command.process(context);
                }
            });
        });
    }

    public async start(): Promise<void> {
        await this.api.v2.login();
        this.startTime = Date.now();
        await this.tg.start({ drop_pending_updates: true });
        global.logger.info("Bot started");
    }

    public async stop(): Promise<void> {
        await this.tg.stop();
        global.logger.info("Bot stopped");
    }

    private checkReplay(ctx: UnifiedMessageContext): boolean {
        if (!ctx.hasAttachments("doc")) {
            return false;
        }
        const replays = ctx.getAttachments("doc").filter((d) => d.file_name?.endsWith(".osr"));
        return replays.length > 0;
    }

    private getMapFromAttachments(ctx: UnifiedMessageContext): number | null {
        return ctx.hasAttachments("link") ? IsMap(ctx.getAttachments("link")[0].url) : null;
    }

    private getScoreFromAttachments(ctx: UnifiedMessageContext): number | null {
        return ctx.hasAttachments("link") ? IsScore(ctx.getAttachments("link")[0].url) : null;
    }
}
