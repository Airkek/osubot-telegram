import { Module } from './Module';
import Database from './Database';
import Bancho from './modules/Bancho';
import { APICollection } from './API';
import { Templates, ITemplates } from './templates';
import Maps from './Maps';
import { ReplayParser } from './Replay';
import * as axios from 'axios';
import { Bot as TG, GrammyError, HttpError} from 'grammy'
import Admin from './modules/Admin';
import Main from './modules/Main';
import BanchoPP from './pp/bancho';
import Gatari from './modules/Gatari';
import IsMap from './MapRegexp';
import Ripple from './modules/Ripple';
import Donaters from './Donaters';
import Akatsuki from './modules/Akatsuki';
import AkatsukiRelax from './modules/AkatsukiRelax';
import OsuTrackAPI from './Track';
import BanchoV2 from "./api/BanchoV2";
import Util from './Util';
import IgnoreList from './Ignore';
import UnifiedMessageContext from './TelegramSupport';
import BeatLeader from './modules/BeatLeader';
import ScoreSaber from './modules/ScoreSaber';

export interface IBotConfig {
    tg: {
        token: string,
        owner: number
    }
    tokens: {
        bancho_v2_app_id: number,
        bancho_v2_secret: string
    }
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
    donaters: Donaters;
    track: OsuTrackAPI;
    v2: BanchoV2;
    startTime: number;
    totalMessages: number;
    version: string;
    basicOverride: (cmd: string, override: string) => void;
    constructor(config: IBotConfig) {
        this.config = config;

        this.tg = new TG(config.tg.token);
        this.modules = [];

        this.database = new Database(this.tg, this.config.tg.owner);

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
            new Main(this)
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
            for (let user of context.message.new_chat_members) {
                if (!this.database.chats.isUserInChat(user.id, context.chatId)) {
                    this.database.chats.userJoined(user.id, context.chat.id);
                }
            }
        })

        this.tg.on("message:left_chat_member", async (context) => {
            this.database.chats.userLeft(context.message.left_chat_member.id, context.chat.id);
        })

        this.basicOverride = (cmd, override) => {
            this.tg.command(cmd, async (context) => {
                context.message.text = override;
                var ctx = new UnifiedMessageContext(context, this.tg);
                for(let module of this.modules) {
                    let check = module.checkContext(ctx);
                    if(check) {
                        check.command.process(ctx);
                    }
                }
            })
        }

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
            var ctx = new UnifiedMessageContext(context, this.tg);
            for(let module of this.modules) {
                let check = module.checkContext(ctx);
                if(check) {
                    if(check.map) {
                        let chat = this.maps.getChat(ctx.peerId);
                        if(!chat || chat.map.id.map != check.map) {
                            let map = await this.api.v2.getBeatmap(check.map);
                            this.maps.setMap(ctx.peerId, map);
                        }
                    }
                    if(this.disabled.includes(ctx.peerId) && check.command.disables) return;
                    check.command.process(ctx);
                }
            }

            await context.answerCallbackQuery();
        });

        this.tg.on("message", async (context) => {
            var ctx = new UnifiedMessageContext(context, this.tg);
            if(ctx.isGroup || ctx.isFromGroup || ctx.isEvent || this.ignored.isIgnored(ctx.senderId))
                return;
            this.totalMessages++;
            let replayDoc = await this.checkReplay(ctx);
            let hasMap = this.checkMap(ctx);
            if(replayDoc && replayDoc.file_path) {
                if(this.disabled.includes(ctx.peerId)) return;
                try {
                    let { data: file } = await axios.default.get(`https://api.telegram.org/file/bot${this.tg.token}/${replayDoc.file_path}`, {
                        responseType: "arraybuffer"
                    });

                    let parser = new ReplayParser(file);
                    let replay = parser.getReplay();
                    let map = await this.api.v2.getBeatmap(replay.beatmapHash);
                    if(replay.mods.diff()) 
                        map = await this.api.v2.getBeatmap(map.id.map, replay.mode, replay.mods);
                    let cover = await this.database.covers.getCover(map.id.set);
                    let calc = new BanchoPP(map, replay.mods);
                    let keyboard = Util.createKeyboard([['B','s'],['G','g'],['R','r']]
                        .map(s => Array.prototype.concat([{
                            text: `[${s[0]}] Мой скор на карте`,
                            command: `${s[1]} c ${Util.getModeArg(replay.mode)}`
                        }], ctx.isChat ? [{
                            text: `[${s[0]}] Топ чата на карте`,
                            command: `${s[1]} lb ${Util.getModeArg(replay.mode)}`
                        }]:[]))
                    );
                    ctx.reply(this.templates.Replay(replay, map, calc), {
                        attachment: cover,
                        keyboard
                    });
                    this.maps.setMap(ctx.peerId, map);
                } catch(e) {
                    console.log(e)
                    ctx.reply("Произошла ошибка при обработке реплея!");
                }
            } else if(hasMap) {
                if(this.disabled.includes(ctx.peerId)) return;
                this.maps.sendMap(hasMap, ctx);
            } else {
                if(!ctx.hasText) return;
                if(ctx.text.toLowerCase().startsWith("map ")) {
                    if(this.disabled.includes(ctx.peerId)) return;
                    this.maps.stats(ctx);
                } else {
                    for(let module of this.modules) {
                        let check = module.checkContext(ctx);
                        if(check) {
                            if (ctx.isChat) {
                                let inChat = await this.database.chats.isUserInChat(ctx.senderId, ctx.chatId);
                                if (!inChat) {
                                    await this.database.chats.userJoined(ctx.senderId, ctx.chatId);
                                }
                            }
                            
                            if(check.map) {
                                let chat = this.maps.getChat(ctx.peerId);
                                if(!chat || chat.map.id.map != check.map) {
                                    let map = await this.api.v2.getBeatmap(check.map);
                                    this.maps.setMap(ctx.peerId, map);
                                }
                            }
                            if(this.disabled.includes(ctx.peerId) && check.command.disables) return;
                            check.command.process(ctx);
                        }
                    }
                }
            }
        });

        this.ignored = new IgnoreList();

        this.donaters = new Donaters();

        this.track = new OsuTrackAPI();

        this.startTime = 0;

        this.totalMessages = 0;

        this.version = require('../../package.json').version;
    }

    registerModule(module: Module | Module[]) {
        if(Array.isArray(module))
            this.modules.push(...module);
        else
            this.modules.push(module);
    }

    initDB(): void {
        for(let k in this.database.servers) {
            this.database.servers[k].createTables();
        }
        this.database.run("CREATE TABLE IF NOT EXISTS covers (id INTEGER, attachment TEXT)");
        this.database.run("CREATE TABLE IF NOT EXISTS photos (url TEXT, attachment TEXT)");
        this.database.run("CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)");
        this.database.run(`CREATE TABLE IF NOT EXISTS users_to_chat ("user" INTEGER, chat INTEGER)`);
    }

    async start() {
        await this.api.v2.login()
        console.log(this.api.v2.logged ? 'Logged in' : 'Failed to login')
        this.startTime = Date.now();
        console.log('Started');
        await this.tg.start({ drop_pending_updates: true })
    }

    async stop() {
        await this.tg.stop()
        console.log('Stopped');
    }

    async checkReplay(ctx: UnifiedMessageContext): Promise<import("@grammyjs/types/message.js").File> {
        if(!ctx.hasAttachments("doc"))
            return null;
        const replays = ctx.getAttachments("doc").filter(doc => doc.file_name?.endsWith(".osr"));
        if (replays.length == 0) {
            return null;
        }


        return await ctx.tgCtx.getFile();
    }

    checkMap(ctx: UnifiedMessageContext): number {
        let hasMap = IsMap(ctx.text);
        let hasAtt = ctx.hasAttachments("link");
        if(hasMap)
            return hasMap;
        if(hasAtt) {
            let url = ctx.getAttachments("link")[0].url;
            hasMap = IsMap(url);
            if(hasMap)
                return hasMap;
        }
        return null;
    }
}
