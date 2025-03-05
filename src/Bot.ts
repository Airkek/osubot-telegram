import { Bot as TG, GrammyError, HttpError } from "grammy";
import * as axios from "axios";
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
    config: IBotConfig;
    tg: TG;
    modules: Module[];
    database: Database;
    api: APICollection;
    templates: ITemplates;
    maps: Maps;
    disabled: number[] = [];
    ignored: IgnoreList;
    track: OsuTrackAPI;
    startTime: number;
    totalMessages: number;
    version: string;
    basicOverride: (cmd: string, override: string) => void;
    constructor(config: IBotConfig) {
        this.config = config;

        this.tg = new TG(config.tg.token);
        this.modules = [];

        this.database = new Database(this.tg, this.config.tg.owner);
        this.ignored = new IgnoreList(this.database);

        this.initDB();

        this.api = new APICollection(this);

        this.templates = Templates;

        this.maps = new Maps(this);

        this.registerModule([
            new Bancho(this),
            new Gatari(this),
            new Ripple(this),
            new Akatsuki(this),
            new AkatsukiRelax(this),
            new BeatLeader(this),
            new ScoreSaber(this),
            new Admin(this),
            new Main(this),
        ]);

        this.tg.catch((err) => {
            const ctx = err.ctx;
            console.error(`Error while handling update ${ctx.update.update_id}:`);
            const e = err.error;
            if (e instanceof GrammyError) {
                console.error("Error in request:", e.description);
            } else if (e instanceof HttpError) {
                console.error("Could not contact Telegram:", e);
            } else {
                console.error("Unknown error:", e);
            }
        });

        this.tg.on("message:new_chat_members", async (context) => {
            for (const user of context.message.new_chat_members) {
                const inChat = await this.database.chats.isUserInChat(user.id, context.chatId);
                if (!inChat) {
                    await this.database.chats.userJoined(user.id, context.chat.id);
                }
            }
        });

        this.tg.on("message:left_chat_member", async (context) => {
            await this.database.chats.userLeft(context.message.left_chat_member.id, context.chat.id);
        });

        this.basicOverride = (cmd, override) => {
            this.tg.command(cmd, async (context) => {
                context.message.text = override;
                const ctx = new UnifiedMessageContext(context, this.tg);
                for (const module of this.modules) {
                    const check = module.checkContext(ctx);
                    if (check) {
                        check.command.process(ctx).then();
                    }
                }
            });
        };

        this.basicOverride("start", "osu help");
        this.basicOverride("help", "osu help");
        this.basicOverride("user", "s u");
        this.basicOverride("recent", "s r");
        this.basicOverride("top_scores", "s t");
        this.basicOverride("chat_leaderboard", "s chat");
        this.basicOverride("chat_leaderboard_mania", "s chat -mania");
        this.basicOverride("chat_leaderboard_taiko", "s chat -taiko");
        this.basicOverride("chat_leaderboard_fruits", "s chat -ctb");

        this.tg.on("callback_query:data", async (context) => {
            const ctx = new UnifiedMessageContext(context, this.tg);
            for (const module of this.modules) {
                const check = module.checkContext(ctx);
                if (check) {
                    if (this.disabled.includes(ctx.peerId) && check.command.disables) {
                        context.answerCallbackQuery().then();
                        return;
                    }
                    if (check.map) {
                        const chat = this.maps.getChat(ctx.peerId);
                        if (!chat || chat.map.id.map != check.map) {
                            const map = await this.api.v2.getBeatmap(check.map);
                            this.maps.setMap(ctx.peerId, map);
                        }
                    }
                    check.command.process(ctx).then(async () => {
                        await context.answerCallbackQuery();
                    });
                }
            }
        });

        this.tg.on("message", async (context) => {
            const ctx = new UnifiedMessageContext(context, this.tg);
            if (ctx.isGroup || ctx.isFromGroup || ctx.isEvent || this.ignored.isIgnored(ctx.senderId)) {
                return;
            }
            this.totalMessages++;
            const replayDoc = await this.checkReplay(ctx);
            const hasScore = this.checkScore(ctx);
            const hasMap = this.checkMap(ctx);
            if (replayDoc && replayDoc.file_path) {
                if (this.disabled.includes(ctx.peerId)) {
                    return;
                }
                try {
                    const { data: file } = await axios.default.get(
                        `https://api.telegram.org/file/bot${this.tg.token}/${replayDoc.file_path}`,
                        {
                            responseType: "arraybuffer",
                        }
                    );

                    const parser = new ReplayParser(file);
                    const replay = parser.getReplay();
                    let map = await this.api.v2.getBeatmap(replay.beatmapHash);
                    if (replay.mods.diff()) {
                        map = await this.api.v2.getBeatmap(map.id.map, replay.mode, replay.mods);
                    }
                    const cover = await this.database.covers.getCover(map.id.set);
                    const calc = new Calculator(map, replay.mods);
                    const keyboard = Util.createKeyboard(
                        [
                            ["B", "s"],
                            ["G", "g"],
                            ["R", "r"],
                        ].map((s) =>
                            Array.prototype.concat(
                                [
                                    {
                                        text: `[${s[0]}] Мой скор на карте`,
                                        command: `${s[1]} c ${Util.getModeArg(replay.mode)}`,
                                    },
                                ],
                                ctx.isChat
                                    ? [
                                          {
                                              text: `[${s[0]}] Топ чата на карте`,
                                              command: `${s[1]} lb ${Util.getModeArg(replay.mode)}`,
                                          },
                                      ]
                                    : []
                            )
                        )
                    );
                    await ctx.reply(this.templates.Replay(replay, map, calc), {
                        attachment: cover,
                        keyboard,
                    });
                    this.maps.setMap(ctx.peerId, map);
                } catch (e) {
                    console.log(e);
                    await ctx.reply("Произошла ошибка при обработке реплея!");
                }
            } else if (hasScore) {
                if (this.disabled.includes(ctx.peerId)) {
                    return;
                }
                const score = await this.api.v2.getScoreByScoreId(hasScore);
                const map = await this.api.v2.getBeatmap(score.beatmapId, score.mode, score.mods);
                const user = await this.api.v2.getUserById(score.player_id);
                const cover = await this.database.covers.getCover(map.id.set);
                const calc = new Calculator(map, score.mods);
                await ctx.reply(
                    `Player: ${user.nickname}\n\n${this.templates.ScoreFull(score, map, calc, "https://osu.ppy.sh")}`,
                    {
                        attachment: cover,
                    }
                );
            } else if (hasMap) {
                if (this.disabled.includes(ctx.peerId)) {
                    return;
                }
                await this.maps.sendMap(hasMap, ctx);
            } else {
                if (!ctx.hasText) {
                    return;
                }
                if (ctx.text.toLowerCase().startsWith("map ")) {
                    if (this.disabled.includes(ctx.peerId)) {
                        return;
                    }
                    await this.maps.stats(ctx);
                } else {
                    for (const module of this.modules) {
                        const check = module.checkContext(ctx);
                        if (check) {
                            if (ctx.isChat) {
                                const inChat = await this.database.chats.isUserInChat(ctx.senderId, ctx.chatId);
                                if (!inChat) {
                                    await this.database.chats.userJoined(ctx.senderId, ctx.chatId);
                                }
                            }

                            if (check.map) {
                                const chat = this.maps.getChat(ctx.peerId);
                                if (!chat || chat.map.id.map != check.map) {
                                    const map = await this.api.v2.getBeatmap(check.map);
                                    this.maps.setMap(ctx.peerId, map);
                                }
                            }
                            if (this.disabled.includes(ctx.peerId) && check.command.disables) {
                                return;
                            }
                            await check.command.process(ctx);
                        }
                    }
                }
            }
        });

        this.track = new OsuTrackAPI();

        this.startTime = 0;

        this.totalMessages = 0;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.version = require("../../package.json").version;
    }

    registerModule(module: Module | Module[]) {
        if (Array.isArray(module)) {
            this.modules.push(...module);
        } else {
            this.modules.push(module);
        }
    }

    initDB(): void {
        this.database.init().then(() => {
            this.ignored.init();
        });
    }

    async start() {
        await this.api.v2.login();
        console.log(this.api.v2.logged ? "Logged in" : "Failed to login");
        this.startTime = Date.now();
        console.log("Started");
        await this.tg.start({ drop_pending_updates: true });
    }

    async stop() {
        await this.tg.stop();
        console.log("Stopped");
    }

    async checkReplay(ctx: UnifiedMessageContext): Promise<import("@grammyjs/types/message.js").File> {
        if (!ctx.hasAttachments("doc")) {
            return null;
        }
        const replays = ctx.getAttachments("doc").filter((doc) => doc.file_name?.endsWith(".osr"));
        if (replays.length == 0) {
            return null;
        }

        return await ctx.tgCtx.getFile();
    }

    checkMap(ctx: UnifiedMessageContext): number {
        let hasMap = IsMap(ctx.text);
        const hasAtt = ctx.hasAttachments("link");
        if (hasMap) {
            return hasMap;
        }
        if (hasAtt) {
            const url = ctx.getAttachments("link")[0].url;
            hasMap = IsMap(url);
            if (hasMap) {
                return hasMap;
            }
        }
        return null;
    }

    checkScore(ctx: UnifiedMessageContext): number {
        let hasScore = IsScore(ctx.text);
        const hasAtt = ctx.hasAttachments("link");
        if (hasScore) {
            return hasScore;
        }
        if (hasAtt) {
            const url = ctx.getAttachments("link")[0].url;
            hasScore = IsMap(url);
            if (hasScore) {
                return hasScore;
            }
        }
        return null;
    }
}
