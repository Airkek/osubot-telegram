import { Module } from './Module';
import Database from './Database';
import Bancho from './modules/Bancho';
import { Command, UnifiedMessageContext } from './Command';
import { APICollection } from './API';
import { Templates, ITemplates } from './templates';
import Maps from './Maps';
import { ReplayParser } from './Replay';
import * as axios from 'axios';
import { Bot as TG, GrammyError, HttpError} from 'grammy'
import News from './News';
import Admin from './modules/Admin';
import Main from './modules/Main';
import BanchoPP from './pp/bancho';
import Gatari from './modules/Gatari';
import IsMap from './MapRegexp';
import Ripple from './modules/Ripple';
import Donaters from './Donaters';
import Akatsuki from './modules/Akatsuki';
import AkatsukiRelax from './modules/AkatsukiRelax';
import Enjuu from './modules/Enjuu';
import OsuTrackAPI from './Track';
import Kurikku from './modules/Kurikku';
import BanchoV2 from "./api/BanchoV2";
import Util from './Util';
import IgnoreList from './Ignore';
import Sakuru from './modules/Sakuru';

interface IBotConfig {
    tg?: {
        token: string,
        owner: number
    }
    tokens?: {
        bancho: string,
        ripple: string
    },
    osu?: {
        username: string,
        password: string
    }
}

export default class Bot {
    config: IBotConfig;
    tg: TG;
    modules: Module[];
    database: Database;
    api: APICollection;
    templates: ITemplates;
    maps: Maps;
    news: News;
    disabled: number[] = [];
    ignored: IgnoreList;
    donaters: Donaters;
    track: OsuTrackAPI;
    v2: BanchoV2;
    startTime: number;
    totalMessages: number;
    version: string;
    constructor(config: IBotConfig) {
        this.config = config;

        this.tg = new TG(config.tg.token);
        this.modules = [];

        this.registerModule([
            new Bancho(this),
            new Gatari(this),
            new Ripple(this),
            new Akatsuki(this),
            new AkatsukiRelax(this),
            new Enjuu(this),
            new Kurikku(this),
            new Sakuru(this),
            new Admin(this),
            new Main(this)
        ]);

        this.database = new Database(this.tg, this.config.tg.owner);

        this.initDB();

        this.api = new APICollection(this);

        this.templates = Templates;

        this.maps = new Maps(this);

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

        this.tg.on("callback_query:data", async (context) => { 
            var ctx = new UnifiedMessageContext(context, this.tg);
            for(let module of this.modules) {
                let check = module.checkContext(ctx);
                if(check) {
                    if(check.map) {
                        let chat = this.maps.getChat(ctx.peerId);
                        if(!chat || chat.map.id.map != check.map) {
                            let map = await this.api.bancho.getBeatmap(check.map);
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
            let replayDoc = this.checkReplay(ctx);
            let hasMap = this.checkMap(ctx);
            if(replayDoc) {
                return; // TODO: telegram-support: download replay 
                if(this.disabled.includes(ctx.peerId)) return;
                try {
                    let { data: file } = await axios.default.get(replayDoc.url, {
                        responseType: "arraybuffer"
                    });
                    let parser = new ReplayParser(file);
                    let replay = parser.getReplay();
                    let map = await this.api.bancho.getBeatmap(replay.beatmapHash);
                    if(replay.mods.diff()) 
                        map = await this.api.bancho.getBeatmap(map.id.map, replay.mode, replay.mods.diff());
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
                            if(check.map) {
                                let chat = this.maps.getChat(ctx.peerId);
                                if(!chat || chat.map.id.map != check.map) {
                                    let map = await this.api.bancho.getBeatmap(check.map);
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

        this.news = new News(this);

        this.ignored = new IgnoreList();

        this.donaters = new Donaters();

        this.track = new OsuTrackAPI();

        this.startTime = 0;

        this.totalMessages = 0;

        this.version = require('../../package.json').version;

        this.v2 = new BanchoV2();

        // this.v2.data.on('osuupdate', update => {
        //     let changesString = [];
        //     for(let ch in update.changes) {
        //         changesString.push(`${ch} [${update.changes[ch]}]`);
        //     }
        //     this.news.notify({
        //         message: `🔔 Новое обновление osu! (${update.version})${update.majors ? `\n❗ Есть важные изменения! (${update.majors})` : ""}
        //         ${changesString.join("\n")}
        //         https://osu.ppy.sh/home/changelog/stable40/${update.version}`,
        //         type: 'osuupdate'
        //     });
        // });

        this.v2.data.on('newranked', async mapset => {
            let modes = [];

            if(mapset.beatmaps.filter(map => map.mode == 0).length)
                modes.push({
                    mode: 'osu!',
                    min: Math.min(...mapset.beatmaps.filter(map => map.mode == 0).map(map => map.stars)),
                    max: Math.max(...mapset.beatmaps.filter(map => map.mode == 0).map(map => map.stars))
                });

            if(mapset.beatmaps.filter(map => map.mode == 1).length)
                modes.push({
                    mode: 'osu!taiko',
                    min: Math.min(...mapset.beatmaps.filter(map => map.mode == 1).map(map => map.stars)),
                    max: Math.max(...mapset.beatmaps.filter(map => map.mode == 1).map(map => map.stars))
                });

            if(mapset.beatmaps.filter(map => map.mode == 2).length)
                modes.push({
                    mode: 'osu!catch',
                    min: Math.min(...mapset.beatmaps.filter(map => map.mode == 2).map(map => map.stars)),
                    max: Math.max(...mapset.beatmaps.filter(map => map.mode == 2).map(map => map.stars))
                });

            if(mapset.beatmaps.filter(map => map.mode == 3).length)
                modes.push({
                    mode: 'osu!mania',
                    min: Math.min(...mapset.beatmaps.filter(map => map.mode == 3).map(map => map.stars)),
                    max: Math.max(...mapset.beatmaps.filter(map => map.mode == 3).map(map => map.stars))
                });

            this.news.notify({
                message: `Новая ранкнутая карта!\n\n${mapset.artist} - ${mapset.title} by ${mapset.creator}\n${modes.map(mode => `${mode.mode} [${mode.min == mode.max ? `${mode.min}` : `${mode.min} - ${mode.max}`}]`).join(", ")}\n\nhttps://osu.ppy.sh/s/${mapset.id}`,
                attachment: await this.database.covers.getCover(mapset.id),
                type: 'newranked'
            });
        });

        /*
        this.v2.data.on('osunews', async news => {
            let attachment = (await this.vk.upload.messagePhoto({
                source: {
                    value: news.image
                }
            })).toString();

            this.news.notify({
                message: `Новость на сайте osu!\n${news.title}\nот ${news.author}\n\n${news.link}`,
                attachment,
                type: 'osunews'
            });
        });*/
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
        this.database.run("CREATE TABLE IF NOT EXISTS errors (code TEXT, info TEXT, error TEXT)");
    }

    async start() {
        await this.v2.login(
            this.config.osu.username,
            this.config.osu.password
        )
        console.log(this.v2.logged ? 'Logged in' : 'Failed to login')
        this.v2.startUpdates();
        this.startTime = Date.now();
        console.log('Started');
        await this.tg.start()
    }

    async stop() {
        await this.tg.stop()
        console.log('Stopped');
    }

    checkReplay(ctx: UnifiedMessageContext): any {
        if(!ctx.hasAttachments("doc"))
            return null;
        const replays = ctx.getAttachments("doc").filter(doc => doc.file_name.endsWith(".osr"));
        if (replays.length == 0) {
            return null;
        }
        return replays[0];
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
