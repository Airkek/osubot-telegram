import * as axios from "axios";
import { IAPI } from "../API";
import { Bot } from "../Bot"
import Mods from "../pp/Mods";
import { APIBeatmap, APIRecentScore, APIScore, APITopScore, APIUser, HitCounts, IDatabaseUser, LeaderboardResponse, LeaderboardScore } from "../Types";
import Util from "../Util";
import qs from "querystring";
import { isNullOrUndefined } from "util";

class SakuruUser implements APIUser {
    api: IAPI;
    id: number;
    nickname: string;
    playcount: number;
    playtime: number;
    pp: number;
    rank: {
        total: number;
        country: number;
    };
    country: string;
    accuracy: number;
    level: number = -1;
    constructor(user: any, mode: number, api: IAPI) {
        let stats = user.stats[['vn_std', 'vn_taiko', 'vn_catch', 'vn_mania'][mode]];
        this.api = api;
        this.id = user.info.id;
        this.nickname = user.info.name;
        this.playcount = stats.plays;
        this.playtime = stats.playtime;
        this.pp = stats.pp;
        this.rank = {
            total: stats.rank,
            country: stats.crank
        };
        this.country = user.info.country;
        this.accuracy = stats.acc;
    }
}

class SakuruTopScore implements APITopScore {
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
        this.beatmapId = score.beatmap.id;
        this.score = score.score;
        this.combo = score.max_combo;
        this.counts = new HitCounts({
            300: score.n300,
            100: score.n100,
            50: score.n50,
            miss: score.nmiss,
            geki: score.ngeki,
            katu: score.nkatu
        }, score.mode);
        this.mods = new Mods(score.mods);
        this.rank = score.grade.replace('X', 'SS');
        this.pp = score.pp;
        this.mode = score.mode;
        this.date = new Date(score.play_time);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class SakuruRecentScore implements APIRecentScore {
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
        this.beatmapId = data.beatmap.id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.n300,
            100: data.n100,
            50: data.n50,
            miss: data.nmiss,
            geki: data.ngeki,
            katu: data.nkatu
        }, data.mode);
        this.mods = new Mods(data.mods);
        this.rank = data.grade.replace('X', 'SS');
        this.mode = data.mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class SakuruScore implements APIScore {
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
            300: data.n300,
            100: data.n100,
            50: data.n50,
            miss: data.nmiss,
            geki: data.ngeki,
            katu: data.nkatu
        }, data.mode);
        this.mods = new Mods(data.mods);
        this.mode = data.mode;
        this.rank = data.grade.replace('X', 'SS');
        this.date = new Date(data.play_time);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class SakuruAPI implements IAPI {
    bot: Bot;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.api = axios.default.create({
            baseURL: "https://osu.sakuru.pw/api",
            timeout: 5000
        });
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        try {
            let { data } = await this.api.get(`/get_player_info?${qs.stringify({ name: nickname, scope: 'all' })}`);

            if(!data.player)
                throw "User not found";
            return new SakuruUser(data.player, mode, this);
        } catch(e) {
            throw e;
        }
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<SakuruTopScore[]> {
        try {
            let { data } = await this.api.get(`/get_player_scores?${qs.stringify({ name: nickname, scope: 'best', mode, limit })}`);
            if(!data.scores)
                throw "No scores";
            return data.scores.map(s => new SakuruTopScore(s, this));
        } catch(e) {
            throw e;
        }
    }

    async getUserRecent(nickname: string, mode: number = 0, limit: number = 3): Promise<SakuruRecentScore> {
        try {
            let { data } = await this.api.get(`/get_player_scores?${qs.stringify({ name: nickname, scope: 'recent', mode, limit })}`);
            if(!data.scores || !data.scores[0])
                throw "No scores";
            return new SakuruRecentScore(data.scores[0], this);
        } catch(e) {
            throw e;
        }
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0, mods: number = null): Promise<APIScore> {
        try {
            let { data } = await this.api.get(`/get_player_scores?${qs.stringify({ name: nickname, mode, bm: beatmapId, scope: 'best' })}`);
            let scores = data.scores;
            if(!isNullOrUndefined(mods))
                scores = scores.filter(p => p.mods == mods);
            if(!scores[0])
                throw "No scores found";
            return new SakuruScore(scores[0], beatmapId, this);
        } catch(e) {
            throw e;
        }
    }

    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode: number = 0, mods: number = null): Promise<LeaderboardResponse> {
        let cache: { mods: number, map: APIBeatmap }[] = [];
        let scores: LeaderboardScore[] = [];
        try {
            cache.push({
                mods: 0,
                map: await this.bot.api.bancho.getBeatmap(beatmapId, mode, 0)
            });
            let lim = Math.ceil(users.length / 5);
            for(var i = 0; i < lim; i++) {
                try {
                    let usrs = users.splice(0, 5);
                    let usPromise = usrs.map(u => this.getScore(u.nickname, beatmapId, mode, mods));
                    let s: APIScore[] = (await Promise.all(usPromise.map(p => p.catch(e => e))));
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
                                    map: await this.bot.api.bancho.getBeatmap(beatmapId, mode, s[j].mods.diff())
                                });
                        } catch(e) {}
                    }
                    scores.push(...s.map((score, j) => {
                        return { user: usrs[j], score };
                    }));
                } catch(e) {}
            }
            return {
                maps: cache,
                scores: scores.sort((a, b) => {
                    if(a.score.score > b.score.score)
                        return -1;
                    else if(a.score.score < b.score.score)
                        return 1;
                    return 0;
                })
            }
        } catch(e) {
            throw e;
        }
    }
}
