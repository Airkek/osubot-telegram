import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import { APIUser, HitCounts, APIScore } from "../Types";
import Mods from "../osu_specific/pp/Mods";
import Util from "../Util";

class AkatsukiRelaxUser implements APIUser {
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
    level: number;
    constructor(data, mode: string) {
        this.id = data.id;
        this.nickname = data.username;
        this.playcount = data.stats[1][mode].playcount;
        this.playtime = data.stats[1][mode].playtime;
        this.pp = data.stats[1][mode].pp;
        this.rank = {
            total: data.stats[1][mode].global_leaderboard_rank,
            country: data.stats[1][mode].country_leaderboard_rank,
        };
        this.country = data.country;
        this.accuracy = data.stats[1][mode].accuracy;
        this.level = data.stats[1][mode].level;
    }
}

class AkatsukiRelaxScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    date: Date;
    constructor(data, mode: number) {
        this.beatmapId = data.beatmap.beatmap_id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts(
            {
                300: data.count_300,
                100: data.count_100,
                50: data.count_50,
                miss: data.count_miss,
                geki: data.count_geki,
                katu: data.count_katu,
            },
            mode
        );
        this.mods = new Mods(data.mods);
        this.rank = data.rank;
        this.pp = data.pp;
        this.mode = mode;
        this.date = new Date(data.time);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class AkatsukiRelaxRecentScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data, mode: number) {
        this.beatmapId = data.beatmap.beatmap_id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts(
            {
                300: data.count_300,
                100: data.count_100,
                50: data.count_50,
                miss: data.count_miss,
                katu: data.count_katu,
                geki: data.count_geki,
            },
            mode
        );
        this.mods = new Mods(data.mods);
        this.rank = data.rank;
        this.mode = mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class AkatsukiRelaxAPI implements IAPI {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://akatsuki.gg/api/v1",
            timeout: 3000,
        });
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        try {
            const { data } = await this.api.get(`/users/full?${qs.stringify({ name: nickname })}`);
            const m = ["std", "taiko", "ctb", "mania"][mode];
            return new AkatsukiRelaxUser(data, m);
        } catch (e) {
            throw e || new Error("User not found");
        }
    }

    async getUserById(id: number, mode?: number): Promise<APIUser> {
        try {
            const { data } = await this.api.get(`/users/full?${qs.stringify({ id })}`);
            const m = ["std", "taiko", "ctb", "mania"][mode];
            return new AkatsukiRelaxUser(data, m);
        } catch (e) {
            throw e || new Error("User not found");
        }
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        try {
            const { data } = await this.api.get(
                `/users/scores/best?${qs.stringify({ name: nickname, mode, l: limit, rx: 1 })}`
            );
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return data.scores.map((score) => new AkatsukiRelaxScore(score, mode));
        } catch (e) {
            throw e || new Error("No scores");
        }
    }

    async getUserTopById(id: number, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        try {
            const { data } = await this.api.get(`/users/scores/best?${qs.stringify({ id, mode, l: limit, rx: 1 })}`);
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return data.scores.map((score) => new AkatsukiRelaxScore(score, mode));
        } catch (e) {
            throw e || new Error("No scores");
        }
    }

    async getUserRecent(nickname: string, mode: number = 0): Promise<APIScore> {
        try {
            const { data } = await this.api.get(
                `/users/scores/recent?${qs.stringify({ name: nickname, mode, l: 1, rx: 1 })}`
            );
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return new AkatsukiRelaxRecentScore(data.scores[0], mode);
        } catch (e) {
            throw e || new Error("No scores");
        }
    }

    async getUserRecentById(id: number, mode?: number, limit?: number): Promise<APIScore> {
        try {
            const { data } = await this.api.get(`/users/scores/recent?${qs.stringify({ id, mode, l: limit, rx: 1 })}`);
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return new AkatsukiRelaxRecentScore(data.scores[0], mode);
        } catch (e) {
            throw e || new Error("No scores");
        }
    }
}
