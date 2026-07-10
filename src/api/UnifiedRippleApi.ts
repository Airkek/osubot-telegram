import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import { UserError } from "../UserError";
import { APIUser, APIUserGradeCounts, HitCounts, APIScore } from "../Types";
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
    levelProgress: number;
    grades?: APIUserGradeCounts;

    mode: number;
    total_score: number;
    profileAvatarUrl: string;
    constructor(data, index: number | string, modeNumber: number, avatarBase: string) {
        const mode = ["std", "taiko", "ctb", "mania"][modeNumber];
        const stats = data?.stats?.[index]?.[mode];
        const level = Number(stats?.level);
        if (!data?.id || !mode || !stats || !Number.isFinite(level)) {
            throw new Error("Invalid user response from game API");
        }
        this.mode = modeNumber;
        this.id = data.id;
        this.nickname = data.username;
        this.playcount = stats.playcount;
        this.playtime = stats.playtime ?? stats.play_time;
        this.pp = stats.pp;
        this.rank = {
            total: stats.global_leaderboard_rank,
            country: stats.country_leaderboard_rank,
        };
        this.country = data.country;
        this.accuracy = stats.accuracy;
        this.level = Math.floor(level);
        this.levelProgress = (level - this.level) * 100;
        if (stats.grades) {
            this.grades = {
                a: stats.grades.a_count,
                s: stats.grades.s_count,
                ss: stats.grades.x_count,
                sh: stats.grades.sh_count,
                ssh: stats.grades.xh_count,
            };
        }
        this.total_score = stats.total_score;
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
        if (!data?.beatmap || typeof data.rank !== "string") {
            throw new Error("Invalid top score response from game API");
        }
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
        if (!data?.beatmap || typeof data.rank !== "string") {
            throw new Error("Invalid recent score response from game API");
        }
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
    constructor() {
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
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new UserError("user-not-found", "User not found");
            }
            throw error;
        }
    }

    async getUserById(id: number, mode: number = 0): Promise<APIUser> {
        try {
            const { data } = await this.v1_api.get(`/users/full?${qs.stringify({ id, relax: -1 })}`);
            return new RippleUser(data, this.statsIndex, mode, this.avatarBase);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new UserError("user-not-found", "User not found");
            }
            throw error;
        }
    }

    private async getUserTopInternal(req: Record<string, string | number>, mode: number): Promise<APIScore[]> {
        req[this.rxKey] = this.rxValue;
        const { data } = await this.v1_api.get(`/users/scores/best?${qs.stringify(req)}`);
        if (data?.code !== 200) {
            throw new Error(data?.message || "Unknown API error");
        }
        if (!Array.isArray(data.scores) || data.scores.length === 0) {
            throw new UserError("no-top-scores", "No scores");
        }
        return data.scores.map((score) => new RippleScore(score, mode));
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        return await this.getUserTopInternal({ name: nickname, mode, l: limit }, mode);
    }

    async getUserTopById(id: number, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        return await this.getUserTopInternal({ id, mode, l: limit }, mode);
    }

    private async getUserRecentInternal(req: Record<string, string | number>, mode: number): Promise<APIScore> {
        req[this.rxKey] = this.rxValue;
        const { data } = await this.v1_api.get(`/users/scores/recent?${qs.stringify(req)}`);
        if (data?.code !== 200) {
            throw new Error(data?.message || "Unknown API error");
        }
        if (!Array.isArray(data.scores) || !data.scores[0]) {
            throw new UserError("no-recent-scores", "No scores");
        }
        return new RippleRecentScore(data.scores[0], mode);
    }

    async getUserRecent(nickname: string, mode: number = 0, limit: number = 1): Promise<APIScore> {
        return await this.getUserRecentInternal({ name: nickname, mode, l: limit }, mode);
    }

    async getUserRecentById(id: number, mode: number = 0, limit: number = 1): Promise<APIScore> {
        return await this.getUserRecentInternal({ id, mode, l: limit }, mode);
    }
}
