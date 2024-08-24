import * as axios from "axios";
import qs from "querystring";
import { V2BeatmapsetsArguments, V2Beatmapset, V2Mod, APIScore, HitCounts, APIBeatmap, APIUser, IDatabaseUser, LeaderboardResponse, IBeatmapObjects, IBeatmapStars, BeatmapStatus, LeaderboardScore } from "../Types";
import Mods from "../pp/Mods";
import Util from "../Util";
import * as fs from "fs";
import IAPI from "./base";
import { Bot } from "../Bot";
import { ICalcStats } from "../pp/Stats";

type Ruleset = "osu" | "mania" | "taiko" | "fruits"; 

interface Score {
    mods: V2Mod[],
    accuracy: number,
    statistics: {
        great: number,
        ok: number,
        miss: number,
        meh: number

        //mania:
        perfect?: number, // geki
        good?: number // katu
    },
    ruleset_id: number,
    ended_at: string,
    pp?: any,
    rank: string,
    total_score: number,
    legacy_total_score: number,
    max_combo: number,
    beatmap: {
        id: number
    },
    passed: boolean
}


interface Beatmap {
    beatmapset_id: number,
    difficulty_rating: number,
    id: number,
    mode: Ruleset,
    status: string,
    total_length: number,
    user_id: number,
    version: string,
    beatmapset: Beatmapset 
}


interface BeatmapExtended extends Beatmap {
    accuracy: number,
    ar: number,
    bpm?: number,
    convert: boolean,
    count_circles: number,
    count_sliders: number,
    count_spinners: number,
    cs: number,
    deleted_at?: string,
    drain: number,
    hit_length: number,
    is_scoreable: boolean,
    last_updated: string,
    mode_int: number,
    passcount: number,
    playcount: number,
    ranked: BeatmapStatus,
    url: string
}

interface UserStats {
    count_100: number,
    count_300: number,
    count_50: number,
    count_miss: number,
    country_rank?: number,
    grade_counts: {
      a: number,
      s: number,
      sh: number,
      ss: number,
      ssh: number,
    },
    hit_accuracy: number,
    is_ranked: boolean,
    level: {
      current: number,
      progress: number,
    },
    maximum_combo: number,
    play_count: number,
    play_time: number,
    pp: number,
    pp_exp: number,
    global_rank?: number,
    global_rank_exp?: number,
    ranked_score: number,
    replays_watched_by_others: number,
    total_hits: number,
    total_score: number,
  }

interface User {
    avatar_url: string,
    country_code: string,
    default_group?: string,
    id: number,
    is_active: boolean,
    is_bot: boolean,
    is_deleted: boolean,
    is_online: boolean,
    is_supporter: boolean,
    last_visit?: string,
    pm_friends_only: boolean,
    profile_colour?: string,
    username: string,
    statistics?: UserStats
    playmode: Ruleset
}

interface Covers {
    cover?: string,
    "cover@2x"?: string,
    card?: string,
    "card@2x"?: string,
    list?: string,
    "list@2x"?: string,
    slimcover?: string,
    "slimcover@2x"?: string,
}

interface Beatmapset {
    artist?: string,
    artist_unicode?: string,
    covers?: Covers,
    creator?: string,
    favourite_count?: number,
    id: number,
    nsfw?: boolean,
    offset?: number,
    play_count?: number,
    preview_url?: string,
    source?: string,
    status?: string,
    spotlight?: boolean,
    title?: string,
    title_unicode?: string,
    user_id?: number,
    video?: boolean,
}

interface BeatmapDifficultyAttributesResponse {
    attributes: BeatmapDifficultyAttributes
}

interface BeatmapDifficultyAttributes{
    max_combo: number,
    star_rating: number,
    overall_difficulty?: number,
    approach_rate?: number,
    aim_difficulty?: number,
    speed_difficulty?: number
}

class V2Beatmap implements APIBeatmap {
    artist: string;
    id: { set: number; map: number; };
    bpm: number;
    creator: { nickname: string; id: number; };
    status: string;
    stats: ICalcStats;
    diff: IBeatmapStars;
    objects: IBeatmapObjects;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;

    constructor(beatmap: BeatmapExtended, attributes: BeatmapDifficultyAttributes) {
        this.artist = beatmap.beatmapset.artist;
        this.id = {
            set: beatmap.beatmapset_id,
            map: beatmap.id
        };
        this.bpm = beatmap.bpm;
        this.creator = {
            nickname: beatmap.beatmapset.creator,
            id: beatmap.beatmapset.user_id
        };
        this.status = BeatmapStatus[Number(beatmap.ranked)];
        this.stats = Util.getStats({
            ar: attributes.approach_rate || beatmap.ar,
            cs: beatmap.cs,
            od: attributes.overall_difficulty || 0,
            hp: beatmap.drain
        }, beatmap.mode_int);
        this.diff = {
            stars: attributes.star_rating || beatmap.difficulty_rating
        };
        this.objects = {
            circles: beatmap.count_circles,
            sliders: beatmap.count_sliders,
            spinners: beatmap.count_spinners
        };
        this.title = beatmap.beatmapset.title;
        this.length = beatmap.hit_length;
        this.version = beatmap.version;
        this.combo = attributes.max_combo;
        this.mode = beatmap.mode_int;
    }
}

interface BeatmapUserScore {
    position: number,
    score: Score
}

class V2RecentScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data: Score) {
        this.beatmapId = data.beatmap.id;
        this.score = data.total_score || data.legacy_total_score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.statistics.great || 0,
            100: data.statistics.ok || 0,
            50: data.statistics.meh || 0,
            miss: data.statistics.miss || 0,
            katu: data.statistics.good || 0,
            geki: data.statistics.perfect || 0
        }, data.ruleset_id);
        this.mods = new Mods(data.mods as V2Mod[]);
        this.rank = data.passed ? data.rank : "F";
        this.mode = data.ruleset_id;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class V2Score implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    pp: number;
    date: Date;
    v2_acc: number;
    constructor(data: Score, forceLaserScore = false) {
        this.beatmapId = data.beatmap.id;
        this.score = forceLaserScore ? data.total_score : data.legacy_total_score || data.total_score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.statistics.great || 0,
            100: data.statistics.ok || 0,
            50: data.statistics.meh || 0,
            miss: data.statistics.miss || 0,
            katu: data.statistics.good || 0,
            geki: data.statistics.perfect || 0
        }, data.ruleset_id);
        this.mods = new Mods(data.mods as V2Mod[]);
        this.rank = data.rank;
        this.mode = data.ruleset_id;
        this.date = new Date(data.ended_at);
        this.pp = data.pp;
        this.v2_acc = data.accuracy;
    }

    accuracy() {
        return this.v2_acc;
    }
}

class V2User implements APIUser {
    id: number;
    nickname: string;
    playcount: number;
    playtime: number;
    pp: number;
    rank: { total: number; country: number; };
    country: string;
    accuracy: number;
    level: number;
    mode: number;

    constructor(data: User) {
        this.id = data.id;
        this.nickname = data.username;
        this.playcount = data.statistics.play_count;
        this.playtime = data.statistics.play_time;
        this.pp = data.statistics.pp;
        this.rank = {
            total: data.statistics.global_rank,
            country: data.statistics.country_rank
        };
        this.country = data.country_code;
        this.accuracy = data.statistics.hit_accuracy;
        this.level = data.statistics.level.current;
        this.mode = getRulesetId(data.playmode)
    }
}

var getRuleset = (mode: number): Ruleset => {
    let ruleset: Ruleset = "osu";
    switch (mode) {
        case 0: ruleset = "osu"; break;
        case 1: ruleset = "taiko"; break;
        case 2: ruleset = "fruits"; break;
        case 3: ruleset = "mania"; break;
    }
    return ruleset;
}

var getRulesetId = (ruleset: Ruleset | string): number => {
    let mode = 0;
    switch (ruleset) {
        case "osu": mode = 0; break;
        case "taiko": mode = 1; break;
        case "fruits": mode = 2; break;
        case "mania": mode = 3; break;
    }
    return mode;
}

class BanchoAPIV2 implements IAPI {
    api: axios.AxiosInstance;
    logged: number;
    token?: string;
    app_id: number;
    client_secret: string;
    bot: Bot;
    constructor(bot: Bot) {
        this.api = axios.default.create({
            baseURL: "https://osu.ppy.sh/api/v2",
            timeout: 1e4
        });
        this.bot = bot;
        this.app_id = this.bot.config.tokens.bancho_v2_app_id;
        this.client_secret = this.bot.config.tokens.bancho_v2_secret;

        this.logged = 0;
    }

    async login() {
        let { data } = await axios.default.post(`https://osu.ppy.sh/oauth/token`, {
            grant_type: "client_credentials",
            client_id: this.app_id,
            client_secret: this.client_secret,
            scope: "identify public"
        });
        if(!data.access_token)
            return this.logged = -1;
        this.token = data.access_token;
        this.logged = 1;
    }

    async get(method: string, query?: {[key: string]: any}) {
        try {
            let { data } = await this.api.get(`${method}${query ? `?${qs.stringify(query)}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'x-api-version': '20240529'
                }
            });
            return data;
        } catch(e) {
            if(e.response?.status == 401) {
                await this.refresh();
                return this.get(method, query);
            }
            return undefined;
        }
    }

    async post(method: string, query?: {[key: string]: any}) {
        try {
            let { data } = await this.api.post(`${method}`, query, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'x-api-version': '20240529'
                }
            });
            return data;
        } catch(e) {
            if(e.response?.status == 401) {
                await this.refresh();
                return this.post(method, query);
            } 
            return undefined;
        }
    }

    async refresh() {
        if(this.logged != 1)
            throw "Not logged in";
        return await this.login();
    }

    async getUser(nickname: string, mode?: number): Promise<APIUser> {
        let data = await this.get(`/users/${nickname.replace(' ', '_')}/${mode !== undefined ? getRuleset(mode) : ''}`, {
            key: 'username'
        });
        
        if (data === undefined) {
            throw "User not found";
        }

        return new V2User(data);
    }

    async getUserById(id: number | string, mode?: number): Promise<APIUser> {
        let data = await this.get(`/users/${id}/${mode !== undefined ? getRuleset(mode) : ''}`, {
            key: 'id'
        });
        
        if (data === undefined) {
            throw "User not found";
        }

        return new V2User(data);
    }

    async getUserRecent(nickname: string, mode?: number, limit?: number ): Promise<APIScore> {
        let user = await this.getUser(nickname);
        return await this.getUserRecentById(user.id as number, mode, limit);
    }

    async getUserTop(nickname: string, mode?: number, limit?: number): Promise<APIScore[]> {
        let user = await this.getUser(nickname);
        return await this.getUserTopById(user.id as number, mode, limit);
    }

    async getScore(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<APIScore> {
        let user = await this.getUser(nickname);
        return await this.getScoreByUid(user.id as number, beatmapId, mode, mods);
    }

    async getBeatmap(id: number | string, mode?: number, mods?: number): Promise<APIBeatmap> {
        if (typeof id == "string") {
            return await this.bot.api.bancho.getBeatmap(id);
        }

        let data: BeatmapExtended = await this.get(`/beatmaps/${id}`);
        if (data === undefined) {
            throw "Beatmap not found";
        }

        let attributes: BeatmapDifficultyAttributesResponse = await this.post(`/beatmaps/${data.id}/attributes`, mods !== undefined && mode !== undefined ? {
            mods,
            ruleset_id: mode
        } : undefined);

        if (attributes === undefined) {
            throw "Beatmap not found";
        }

        let beatmap = new V2Beatmap(data, attributes.attributes);

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

    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode?: number, mods?: number): Promise<LeaderboardResponse> {
        let map = await this.getBeatmap(beatmapId);
        let scores: LeaderboardScore[] = [];
        try {
            let lim = Math.ceil(users.length / 5);
            for(var i = 0; i < lim; i++) {
                try {
                    let usrs = users.splice(0, 5);
                    let usPromise = usrs.map(
                        u => this.getScoreByUid(u.uid, beatmapId, mode, mods, true)
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
                    scores.push(...s.map((score, j) => {
                        return {
                            user: usrs[j],
                            score
                        };
                    }));
                }catch(e){} // Ignore "No scores"
            }
            return {
                map,
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

    async getBeatmapsets(args: V2BeatmapsetsArguments): Promise<V2Beatmapset[]> {
        let data = await this.get('/beatmapsets/search/', { q: args.query || null, s: args.status || 'ranked' });
        return data.beatmapsets.map(set => ({
            id: set.id,
            title: set.title,
            artist: set.artist,
            rankedDate: new Date(set.ranked_date),
            creator: set.creator,
            status: set.status,
            beatmaps: set.beatmaps.map(map => ({
                id: map.id,
                mode: map.mode_int,
                stars: map.difficulty_rating,
                version: map.version
            }))
        }));
    }

    async getUserRecentById(uid: number | string, mode: number, limit: number = 1): Promise<APIScore> {
        let data = await this.get(`/users/${uid}/scores/recent`, { 
            mode: getRuleset(mode), 
            include_fails: true,
            limit: limit
        });

        if (data[0]) {
            let score = data[0];
            return new V2RecentScore(score);
        } else {
            throw "No recent scores";
        }
    }

    async getUserTopById(uid: number | string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        let data = await this.get(`/users/${uid}/scores/best`, { 
            mode: getRuleset(mode), 
            include_fails: true,
            limit
        });

        if (data[0]) {
            return data.map(s => new V2Score(s));
        } else {
            throw "No top scores";
        }
    }

    async getScoreByUid(uid: number | string, beatmapId: number, mode?: number, mods?: number, forceLazerScore = false): Promise<APIScore> {
        let data: BeatmapUserScore = await this.get(`/beatmaps/${beatmapId}/scores/users/${uid}`, {
            mode: getRuleset(mode),
            mods: '' //TODO
        });
        
        if (!data) {
            throw "No scores found";
        }
    
        return new V2Score(data.score, forceLazerScore);
    }
}

export default BanchoAPIV2;
