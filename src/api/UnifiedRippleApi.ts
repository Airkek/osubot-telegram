import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import { APIUser, HitCounts, APIScore } from "../Types";
import Mods from "../osu_specific/pp/Mods";
import Util from "../Util";

class RippleUser implements APIUser {
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

    mode: number;
    total_score: number;
    profileAvatarUrl: string;
    constructor(data, index: number | string, modeNumber: number, avatarBase: string) {
        const mode = ["std", "taiko", "ctb", "mania"][modeNumber];
        this.mode = modeNumber;
        this.id = data.id;
        this.nickname = data.username;
        this.playcount = data.stats[index][mode].playcount;
        this.playtime = data.stats[index][mode].playtime;
        this.pp = data.stats[index][mode].pp;
        this.rank = {
            total: data.stats[index][mode].global_leaderboard_rank,
            country: data.stats[index][mode].country_leaderboard_rank,
        };
        this.country = data.country;
        this.accuracy = data.stats[index][mode].accuracy;
        this.level = data.stats[index][mode].level;
        this.total_score = data.stats[index][mode].total_score;
        this.profileAvatarUrl = `${avatarBase}/${data.id}`;
    }
}

class RippleScore implements APIScore {
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

class RippleRecentScore implements APIScore {
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

export default class UnifiedRippleAPI implements IAPI {
    protected readonly v1_api: axios.AxiosInstance;
    protected readonly peppy_api: axios.AxiosInstance;
    constructor() {
        this.peppy_api = axios.default.create({
            baseURL: this.baseUrl + "/api",
            timeout: 15000,
        });
        this.v1_api = axios.default.create({
            baseURL: this.baseUrl + "/api/v1",
            timeout: 15000,
        });
    }

    protected get avatarBase() {
        return "https://a.ripple.moe";
    }

    protected get baseUrl() {
        return "https://ripple.moe";
    }

    protected get statsIndex(): number | string {
        return "classic";
    }

    protected get rxValue(): number {
        return 0;
    }

    protected get rxKey(): string {
        return "relax";
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        try {
            const { data } = await this.v1_api.get(`/users/full?${qs.stringify({ name: nickname, relax: -1 })}`);
            return new RippleUser(data, this.statsIndex, mode, this.avatarBase);
        } catch (e) {
            throw e || new Error("User not found");
        }
    }

    async getUserById(id: number, mode?: number): Promise<APIUser> {
        try {
            const { data } = await this.v1_api.get(`/users/full?${qs.stringify({ id, relax: -1 })}`);
            return new RippleUser(data, this.statsIndex, mode, this.avatarBase);
        } catch (e) {
            throw e || new Error("User not found");
        }
    }

    private async getUserTopInternal(req, mode: number): Promise<APIScore[]> {
        try {
            req[this.rxKey] = this.rxValue;
            const { data } = await this.v1_api.get(`/users/scores/best?${qs.stringify(req)}`);
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return data.scores.map((score) => new RippleScore(score, mode));
        } catch (e) {
            throw e || new Error("No scores");
        }
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        return await this.getUserTopInternal({ name: nickname, mode, l: limit }, mode);
    }

    async getUserTopById(id: number, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        return await this.getUserTopInternal({ id, mode, l: limit }, mode);
    }

    private async getUserRecentInternal(req, mode: number): Promise<APIScore> {
        req[this.rxKey] = this.rxValue;
        try {
            const { data } = await this.v1_api.get(`/users/scores/recent?${qs.stringify(req)}`);
            if (data.code != 200 || !data.scores) {
                throw new Error(data.message || "Unknown error");
            }
            return new RippleRecentScore(data.scores[0], mode);
        } catch (e) {
            throw e || new Error("No scores");
        }
    }

    async getUserRecent(nickname: string, mode: number = 0, limit: number = 1): Promise<APIScore> {
        return await this.getUserRecentInternal({ name: nickname, mode, l: limit }, mode);
    }

    async getUserRecentById(id: number, mode: number = 0, limit: number = 1): Promise<APIScore> {
        return await this.getUserRecentInternal({ id, mode, l: limit }, mode);
    }
}
