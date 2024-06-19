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

    /**
     * @deprecated The method should not be used
     */
    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        throw "Bancho api V1 deprecated";
    }

    /**
     * @deprecated The method should not be used
     */
    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APITopScore[]> {
        throw "Bancho api V1 deprecated";
    }

    /**
     * @deprecated The method should not be used
     */
    async getUserRecent(nickname: string, mode: number = 0, place: number = 1): Promise<APIRecentScore> {
        throw "Bancho api V1 deprecated";
    }

    /**
     * @deprecated The method should not be used
     */
    async getScore(nickname: string, beatmapId: number, mode: number = 0, mods: number = null): Promise<APIScore> {
        throw "Bancho api V1 deprecated";
    }

    /**
     * @deprecated The method should not be used
     */
    async getBeatmap(id: number | string, mode: number = 0, mods: number = 0): Promise<APIBeatmap> {
        // Preserving only for replays
        let opts: any = {
            k: this.token,
            a: 1,
            mode: mode
        };
        if(typeof id == "number")
            throw "Bancho api V1 deprecated";
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

    /**
     * @deprecated The method should not be used
     */
    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode: number = 0, mods: number = null): Promise<LeaderboardResponse> {
        throw "Bancho api V1 deprecated";
    }
}