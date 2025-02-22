import IAPI from "./base";
import * as axios from "axios";
import {
    APIUser,
    HitCounts,
    APIScore,
    IDatabaseUser,
    LeaderboardResponse,
    APIBeatmap,
    LeaderboardScore,
} from "../Types";
import qs from "querystring";
import Util from "../Util";
import Mods from "../pp/Mods";
import { isNullOrUndefined } from "util";
import { Bot } from "../Bot";

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
    constructor(data) {
        this.id = Number(data.user_id);
        this.nickname = data.username;
        this.playcount = Number(data.playcount);
        this.playtime = Number(data.playtime);
        this.pp = Number(data.pp_raw);
        this.rank = {
            total: Number(data.pp_rank),
            country: Number(data.pp_country_rank),
        };
        this.country = data.country;
        this.accuracy = Number(data.accuracy);
        this.level = Number(data.level);
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
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts(
            {
                300: Number(data.count300),
                100: Number(data.count100),
                50: Number(data.count50),
                katu: Number(data.countkatu),
                geki: Number(data.countgeki),
                miss: Number(data.countmiss),
            },
            mode
        );
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank;
        this.mode = mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class RippleScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    mode: number;
    rank: string;
    date: Date;
    pp: number;
    constructor(data, mode: number) {
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts(
            {
                300: Number(data.count300),
                100: Number(data.count100),
                50: Number(data.count50),
                katu: Number(data.countkatu),
                geki: Number(data.countgeki),
                miss: Number(data.countmiss),
            },
            mode
        );
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank;
        this.mode = mode;
        this.date = new Date(data.date);
        this.pp = Number(data.pp);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class RippleAPI implements IAPI {
    bot: Bot;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.api = axios.default.create({
            baseURL: "https://ripple.moe/api",
            timeout: 3000,
        });
    }

    async getBeatmap(id: number | string, mode?: number, mods?: Mods): Promise<APIBeatmap> {
        return await this.bot.api.v2.getBeatmap(id, mode, mods);
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        const { data } = await this.api.get(`/get_user?${qs.stringify({ u: nickname, m: mode, type: "string" })}`);
        if (!data[0]) {
            throw new Error("User not found");
        }
        return new RippleUser(data[0]);
    }

    async getUserById(id: number | string, mode: number = 0): Promise<APIUser> {
        const { data } = await this.api.get(`/get_user?${qs.stringify({ u: id, m: mode })}`);
        if (!data[0]) {
            throw new Error("User not found");
        }
        return new RippleUser(data[0]);
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        const { data } = await this.api.get(
            `/get_user_best?${qs.stringify({ u: nickname, m: mode, limit, type: "string" })}`
        );
        return data.map((s) => new RippleScore(s, mode));
    }

    async getUserTopById(id: number | string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        const { data } = await this.api.get(`/get_user_best?${qs.stringify({ u: id, m: mode, limit })}`);
        return data.map((s) => new RippleScore(s, mode));
    }

    async getUserRecent(nickname: string, mode: number = 0): Promise<APIScore> {
        const { data } = await this.api.get(
            `/get_user_recent?${qs.stringify({ u: nickname, m: mode, limit: 1, type: "string" })}`
        );
        if (data[0]) {
            return new RippleRecentScore(data[0], mode);
        }
        throw new Error("No recent scores");
    }

    async getUserRecentById(id: number | string, mode: number = 0): Promise<APIScore> {
        const { data } = await this.api.get(`/get_user_recent?${qs.stringify({ u: id, m: mode, limit: 1 })}`);
        if (data[0]) {
            return new RippleRecentScore(data[0], mode);
        }
        throw new Error("No recent scores");
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0, mods: number = null): Promise<APIScore> {
        const opts = {
            u: nickname,
            b: beatmapId,
            m: mode,
            type: "string",
        };
        try {
            let { data } = await this.api.get(`/get_scores?${qs.stringify(opts)}`);
            if (!isNullOrUndefined(mods)) {
                data = data.filter((p) => p.enabled_mods == mods);
            }
            if (!data[0]) {
                throw new Error("No scores found");
            }
            data[0].beatmap_id = beatmapId;
            return new RippleScore(data[0], mode);
        } catch (e) {
            throw e || new Error("Unknown API error");
        }
    }

    async getScoreByUid(
        uid: number | string,
        beatmapId: number,
        mode: number = 0,
        mods: number = null
    ): Promise<APIScore> {
        const opts = {
            u: uid,
            b: beatmapId,
            m: mode,
        };
        try {
            let { data } = await this.api.get(`/get_scores?${qs.stringify(opts)}`);
            if (!isNullOrUndefined(mods)) {
                data = data.filter((p) => p.enabled_mods == mods);
            }
            if (!data[0]) {
                throw new Error("No scores found");
            }
            data[0].beatmap_id = beatmapId;
            return new RippleScore(data[0], mode);
        } catch (e) {
            throw e || new Error("Unknown API error");
        }
    }

    async getLeaderboard(
        beatmapId: number,
        users: IDatabaseUser[],
        mode: number = 0,
        mods: number = null
    ): Promise<LeaderboardResponse> {
        const map = await this.getBeatmap(beatmapId, mode, new Mods(0));
        const scores: LeaderboardScore[] = [];
        try {
            const lim = Math.ceil(users.length / 5);
            for (let i = 0; i < lim; i++) {
                try {
                    const usrs = users.splice(0, 5);
                    const usPromise = usrs.map((u) => this.getScoreByUid(u.game_id, beatmapId, mode, mods));
                    const s: APIScore[] = await Promise.all(usPromise.map((p) => p.catch((e) => e)));
                    for (let j = s.length - 1; j >= 0; j--) {
                        const ok = typeof s[j] !== "string" && !(s[j] instanceof Error);
                        if (!ok) {
                            s.splice(j, 1);
                            usrs.splice(j, 1);
                        }
                    }
                    scores.push(
                        ...s.map((score, j) => {
                            return {
                                user: usrs[j],
                                score,
                            };
                        })
                    );
                } catch {
                    // Ignore "No scores"
                }
            }

            return {
                map,
                scores: scores.sort((a, b) => {
                    if (a.score.score > b.score.score) {
                        return -1;
                    } else if (a.score.score < b.score.score) {
                        return 1;
                    }
                    return 0;
                }),
            };
        } catch (e) {
            throw e || new Error("Unknown error");
        }
    }
}
