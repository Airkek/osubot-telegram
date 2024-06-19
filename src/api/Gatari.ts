import IAPI from './base';
import * as axios from 'axios';
import qs from 'querystring';
import { APIUser, APITopScore, HitCounts, APIRecentScore, APIScore, IDatabaseUser, LeaderboardResponse, APIBeatmap, LeaderboardScore, IDatabaseUserStats } from '../Types';
import Mods from '../pp/Mods';
import Util from '../Util';
import { Bot } from "../Bot"

class GatariUser implements APIUser {
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
    constructor(user: any, stats: any, api: IAPI) {
        this.api = api;
        this.id = user.id;
        this.nickname = user.username;
        this.playcount = stats.playcount;
        this.playtime = stats.playtime;
        this.pp = stats.pp;
        this.rank = {
            total: stats.rank,
            country: stats.country_rank
        };
        this.country = user.country;
        this.accuracy = stats.avg_accuracy;
        this.level = stats.level;
    }
}

class GatariTopScore implements APITopScore {
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
    constructor(score: any, api: IAPI) {
        this.api = api;
        this.beatmapId = score.beatmap.beatmap_id;
        this.score = score.score;
        this.combo = score.max_combo;
        this.counts = new HitCounts({
            300: score.count_300,
            100: score.count_100,
            50: score.count_50,
            miss: score.count_miss,
            geki: score.count_gekis,
            katu: score.count_katu
        }, score.play_mode);
        this.mods = new Mods(score.mods);
        this.rank = score.ranking.replace('X', 'SS');
        this.pp = score.pp;
        this.mode = score.play_mode;
        this.date = new Date(score.time);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class GatariRecentScore implements APIRecentScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data: any, api: IAPI) {
        this.api = api;
        this.beatmapId = data.beatmap.beatmap_id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.count_300,
            100: data.count_100,
            50: data.count_50,
            miss: data.count_miss,
            geki: data.count_gekis,
            katu: data.count_katu
        }, data.play_mode);
        this.mods = new Mods(data.mods);
        this.rank = data.ranking.replace('X', 'SS');
        this.mode = data.play_mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class GatariScore implements APIScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    mode: number;
    rank: string;
    date: Date;
    constructor(data: any, id: number, api: IAPI) {
        this.api = api;
        this.beatmapId = id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.count_300,
            100: data.count_100,
            50: data.count_50,
            miss: data.count_miss
        }, data.play_mode);
        this.mods = new Mods(data.mods);
        this.mode = data.play_mode;
        this.rank = data.rank.replace('X', 'SS');
        this.mode = data.play_mode;
        this.date = new Date(data.time * 1e3);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class GatariAPI implements IAPI {
    bot: Bot;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.api = axios.default.create({
            baseURL: "https://api.gatari.pw",
            timeout: 3000
        });
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        try {
            let { data: user } = await this.api.get(`/users/get?${qs.stringify({u: nickname})}`);
            let { data: stats } = await this.api.get(`/user/stats?${qs.stringify({u: nickname, mode: mode})}`);
            if(user.code != 200 || stats.code != 200)
                throw "Unknown API error";
            if(!user.users[0])
                throw "User not found";
            return new GatariUser(user.users[0], stats.stats, this);
        } catch(e) {
            throw e;
        }
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APITopScore[]> {
        try {
            let user = await this.getUser(nickname);
            let { data } = await this.api.get(`/user/scores/best?${qs.stringify({id: user.id, mode: mode, p: 1, l: limit})}`);
            if(!data.scores)
                throw "No scores";
            return data.scores.map(s => new GatariTopScore(s, this));
        } catch (e) {
            throw e;
        }
    }

    async getUserRecent(nickname: string, mode: number = 0): Promise<APIRecentScore> {
        try {
            let user = await this.getUser(nickname);
            let { data } = await this.api.get(`/user/scores/recent?${qs.stringify({id: user.id, mode: mode, p: 1, l: 1, f: 1})}`);
            if(!data.scores[0])
                throw "No scores";
            return new GatariRecentScore(data.scores[0], this);
        } catch (e) {
            throw e;
        }
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0): Promise<APIScore> {
        if(mode > 1)
            throw "Mode is not supported";
        try {
            let user = await this.getUser(nickname);
            let { data } = await this.api.get(`/beatmap/user/score?${qs.stringify({b: beatmapId, u: user.id, mode: mode})}`);
            if(!data.score)
                throw "No score";
            return new GatariScore(data.score, beatmapId, this);
        } catch (e) {
            throw e;
        }
    }

    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode: number = 0): Promise<LeaderboardResponse> {
        let cache: { mods: number, map: APIBeatmap }[] = [];
        let scores: LeaderboardScore[] = [];
        try {
            cache.push({
                mods: 0,
                map: await this.bot.v2.getBeatmap(beatmapId, mode, 0)
            });
            let lim = Math.ceil(users.length / 5);
            for(var i = 0; i < lim; i++) {
                try {
                    let usrs = users.splice(0, 5);
                    let usPromise = usrs.map(
                        u => this.getScore(u.nickname, beatmapId, mode)
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
                                    map: await this.bot.v2.getBeatmap(beatmapId, mode, s[j].mods.diff())
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