import IAPI from './base';
import * as fs from 'fs'
import * as axios from 'axios';
import qs from 'querystring';
import { APIUser, APITopScore, APIBeatmap, APIRecentScore, HitCounts, APIScore, IDatabaseUser, LeaderboardScore, LeaderboardResponse, IDatabaseUserStats } from '../Types';
import Mods from '../pp/Mods';
import Util from '../Util';
import { isNullOrUndefined, isNull } from 'util';
import { Bot } from "../Bot"

class BanchoUser implements APIUser {
    api: IAPI;
    id: number;
    nickname: string;
    playcount: number;
    playtime: number;
    pp: number;
    rank: {
        total: number,
        country: number
    };
    country: string;
    accuracy: number;
    level: number;
    constructor(data: any, api: IAPI) {
        this.api = api;
        this.id = Number(data.user_id);
        this.nickname = data.username;
        this.playcount = Number(data.playcount);
        this.playtime = Number(data.total_seconds_played);
        this.pp = Number(data.pp_raw);
        this.rank = {
            total: Number(data.pp_rank),
            country: Number(data.pp_country_rank)
        };
        this.country = data.country;
        this.accuracy = Number(data.accuracy);
        this.level = Number(data.level);
    }
}

class BanchoTopScore implements APITopScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    date: Date;
    constructor(data: any, mode: number, api: IAPI) {
        this.api = api;
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts({
            300: Number(data.count300),
            100: Number(data.count100),
            50: Number(data.count50),
            miss: Number(data.countmiss),
            katu: Number(data.countkatu),
            geki: Number(data.countgeki)
        }, mode);
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank.replace('X', 'SS');
        this.pp = Number(data.pp);
        this.mode = mode;
        this.date = new Date(data.date);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class BanchoRecentScore implements APIRecentScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data: any, mode: number, api: IAPI) {
        this.api = api;
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts({
            300: Number(data.count300),
            100: Number(data.count100),
            50: Number(data.count50),
            katu: Number(data.countkatu),
            geki: Number(data.countgeki),
            miss: Number(data.countmiss)
        }, mode);
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank.replace('X', 'SS');
        this.mode = mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class BanchoScore implements APIScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    mode: number;
    rank: string;
    date: Date;
    constructor(data: any, mode: number, id: number, api: IAPI) {
        this.api = api;
        this.beatmapId = id;
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts({
            300: Number(data.count300),
            100: Number(data.count100),
            50: Number(data.count50),
            katu: Number(data.countkatu),
            geki: Number(data.countgeki),
            miss: Number(data.countmiss)
        }, mode);
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank.replace('X', 'SS');
        this.mode = mode;
        this.date = new Date(data.date);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class BanchoAPI implements IAPI {
    bot: Bot;
    token: string;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.token = bot.config.tokens.bancho_v1;
        this.api = axios.default.create({
            baseURL: "https://osu.ppy.sh/api",
            timeout: 3000
        });
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        try {
            let { data } = await this.api.get(`/get_user?${qs.stringify({u: nickname, m: mode, k: this.token})}`);
            if(!data[0])
                throw "User not found";
            return new BanchoUser(data[0], this);
        } catch(e) {
            throw e;
        }
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APITopScore[]> {
        try {
            let { data } = await this.api.get(`/get_user_best?${qs.stringify({u: nickname, m: mode, k: this.token, limit: limit})}`);
            if(!data[0])
                throw "No top scores";
            return data.map(s => new BanchoTopScore(s, mode, this));
        } catch(e) {
            throw e;
        }
    }

    async getUserRecent(nickname: string, mode: number = 0, place: number = 1): Promise<APIRecentScore> {
        try {
            let { data } = await this.api.get(`/get_user_recent?${qs.stringify({u: nickname, m: mode, k: this.token, limit: place})}`);
            if(data[place - 1])
                return new BanchoRecentScore(data[place - 1], mode, this);
            else
                throw "No recent scores";
        } catch(e) {
            throw e;
        }
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0, mods: number = null): Promise<APIScore> {
        let opts = {
            k: this.token,
            u: nickname,
            b: beatmapId,
            m: mode
        };
        try {
            let { data } = await this.api.get(`/get_scores?${qs.stringify(opts)}`);
            if(!isNullOrUndefined(mods))
                data = data.filter(p => p.enabled_mods == mods);
            if(!data[0])
                throw "No scores found";
            return new BanchoScore(data[0], mode, beatmapId, this);
        } catch(e) {
            throw e || "Unknown API error";
        }
    }

    async getBeatmap(id: number | string, mode: number = 0, mods: number = 0): Promise<APIBeatmap> {
        let opts: any = {
            k: this.token,
            a: 1,
            mode: mode
        };
        if(typeof id == "number")
            opts.b = id;
        else
            opts.h = String(id);
        if(mods)
            opts.mods = mods;
        let { data } = await this.api.get(`/get_beatmaps?${qs.stringify(opts)}`);
        if(!data[0])
            throw "Beatmap not found";

        let beatmap = new APIBeatmap(data[0]);
        if(mods)
            beatmap.stats.modify(new Mods(mods));

        const folderPath = 'beatmap_cache';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        const filePath = `beatmap_cache/${beatmap.id.map}.osu`;
        if (!fs.existsSync(filePath)) {
            const response = await axios.default.get(`https://osu.ppy.sh/osu/${beatmap.id.map}`, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(response.data, 'binary');
            fs.writeFileSync(filePath, buffer);
        }
        return beatmap;
    }

    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode: number = 0, mods: number = null): Promise<LeaderboardResponse> {
        let cache: { mods: number, map: APIBeatmap }[] = [];
        let scores: LeaderboardScore[] = [];
        try {
            cache.push({
                mods: 0,
                map: await this.getBeatmap(beatmapId, mode, 0)
            });
            let lim = Math.ceil(users.length / 5);
            for(var i = 0; i < lim; i++) {
                try {
                    let usrs = users.splice(0, 5);
                    let usPromise = usrs.map(
                        u => this.getScore(u.nickname, beatmapId, mode, mods)
                    );  
                    let s: APIScore[] = (await Promise.all(usPromise.map(
                            (p) => p.catch(e => e)
                        ))
                    );
                    for(let j = s.length - 1; j >= 0; j--) {
                        let ok = typeof s[j] != "string" && !(s[j] instanceof Error);
                        if(!ok) {
                            s.splice(j, 1);
                            usrs.splice(j, 1);
                        }
                    }
                    for(let j = 0; j < s.length; j++) {
                        try {
                            if(!cache.find(c => c.mods == s[j].mods.diff()))
                                cache.push({
                                    mods: s[j].mods.diff(),
                                    map: await this.getBeatmap(beatmapId, mode, s[j].mods.diff())
                                }); 
                        } catch(e) {}
                    }
                    scores.push(...s.map((score, j) => {
                        return {
                            user: usrs[j],
                            score
                        };
                    }));
                }catch(e){} // Ignore "No scores"
            }
            return {
                maps: cache,
                scores: scores.sort((a,b) => {
                    if(a.score.score > b.score.score)
                        return -1;
                    else if(a.score.score < b.score.score)
                        return 1;
                    return 0;
                })
            }
        } catch (e) {
            throw e || "Unknown error";
        }
    }
}