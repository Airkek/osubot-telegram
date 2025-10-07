import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import {
    APIUser,
    HitCounts,
    APIScore,
    IDatabaseUser,
    LeaderboardResponse,
    LeaderboardScore,
    APIUserGradeCounts,
} from "../Types";
import Mods from "../osu_specific/pp/Mods";
import Util from "../Util";
import { IBeatmapProvider } from "../beatmaps/IBeatmapProvider";

interface GatariUserResponse {
    abbr: string | null;
    clanid: string | null;
    country: string;
    custom_hue: number;
    favourite_mode: number;
    followers_count: number;
    id: number;
    is_online: number;
    latest_activity: number;
    play_style: number;
    privileges: number;
    registered_on: number;
    username: string;
    username_aka: string;
}

interface GatariStatsResponse {
    a_count: number;
    avg_accuracy: number;
    avg_accuracy_ap: number | null;
    avg_accuracy_rx: number;
    avg_hits_play: number;
    country_rank: number;
    country_rank_ap: number | null;
    country_rank_rx: number;
    id: number;
    level: number;
    level_progress: number;
    max_combo: number;
    playcount: number;
    playtime: number;
    pp: number;
    pp_4k: number;
    pp_7k: number;
    pp_ap: number;
    pp_rx: number;
    rank: number;
    rank_ap: number | null;
    rank_rx: number;
    ranked_score: number;
    replays_watched: number;
    s_count: number;
    sh_count: number;
    total_hits: number;
    total_score: number;
    x_count: number;
    xh_count: number;
}

class GatariUser implements APIUser {
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
    mode: number;
    grades?: APIUserGradeCounts;
    total_score: number;
    profileAvatarUrl: string;
    constructor(user: GatariUserResponse, stats: GatariStatsResponse, mode: number) {
        this.id = user.id;
        this.nickname = user.username;
        this.playcount = stats.playcount;
        this.playtime = stats.playtime;
        this.pp = stats.pp;
        this.rank = {
            total: stats.rank,
            country: stats.country_rank,
        };
        this.country = user.country;
        this.accuracy = stats.avg_accuracy;
        this.level = stats.level;
        this.levelProgress = stats.level_progress;
        this.mode = mode;
        this.profileAvatarUrl = `https://a.osugatari.ru/${user.id}`;

        this.grades = {
            a: stats.a_count,
            s: stats.s_count,
            sh: stats.sh_count,
            ss: stats.x_count,
            ssh: stats.xh_count,
        };

        this.total_score = stats.total_score;
    }
}

class GatariTopScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    date: Date;
    constructor(score) {
        this.beatmapId = score.beatmap.beatmap_id;
        this.score = score.score;
        this.combo = score.max_combo;
        this.counts = new HitCounts(
            {
                300: score.count_300,
                100: score.count_100,
                50: score.count_50,
                miss: score.count_miss,
                geki: score.count_gekis,
                katu: score.count_katu,
            },
            score.play_mode
        );
        this.mods = new Mods(score.mods);
        this.rank = score.ranking.replace("X", "SS");
        this.pp = score.pp;
        this.mode = score.play_mode;
        this.date = new Date(score.time * 1000);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class GatariRecentScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data) {
        this.beatmapId = data.beatmap.beatmap_id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts(
            {
                300: data.count_300,
                100: data.count_100,
                50: data.count_50,
                miss: data.count_miss,
                geki: data.count_gekis,
                katu: data.count_katu,
            },
            data.play_mode
        );
        this.mods = new Mods(data.mods);
        this.rank = data.ranking.replace("X", "SS");
        this.mode = data.play_mode;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class GatariScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    mode: number;
    rank: string;
    date: Date;
    pp: number;
    constructor(data, id: number) {
        this.beatmapId = id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts(
            {
                300: data.count_300,
                100: data.count_100,
                50: data.count_50,
                miss: data.count_miss,
            },
            data.play_mode
        );
        this.mods = new Mods(data.mods);
        this.mode = data.play_mode;
        this.rank = data.rank.replace("X", "SS");
        this.mode = data.play_mode;
        this.date = new Date(data.time * 1e3);
        this.pp = Number(data.pp);
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

export default class GatariAPI implements IAPI {
    beatmapProvider: IBeatmapProvider;
    api: axios.AxiosInstance;
    constructor(beatmapProvider: IBeatmapProvider) {
        this.beatmapProvider = beatmapProvider;
        this.api = axios.default.create({
            baseURL: "https://osugatari.ru/api/v2",
            timeout: 15000,
        });
    }

    private async getUserInternal(user: GatariUserResponse, mode?: number): Promise<APIUser> {
        const realMode = mode == undefined ? user.favourite_mode : mode;
        const { data: stats } = await this.api.get(
            `/user/stats?${qs.stringify({
                id: user.id,
                mode: realMode,
            })}`
        );
        if (stats.code != 200) {
            throw new Error("Unknown API error");
        }
        return new GatariUser(user, stats.stats, realMode);
    }

    async getUser(nickname: string, mode: number = 0): Promise<APIUser> {
        const { data: userRes } = await this.api.get(`/users/get?${qs.stringify({ u: nickname })}`);
        if (userRes.code != 200) {
            throw new Error("Unknown API error");
        }
        if (!userRes.users[0]) {
            throw new Error("User not found");
        }
        const user: GatariUserResponse = userRes.users[0];
        return await this.getUserInternal(user, mode);
    }

    async getUserById(id: number | string, mode?: number): Promise<APIUser> {
        const { data: userRes } = await this.api.get(`/users/get?${qs.stringify({ id })}`);
        if (userRes.code != 200) {
            throw new Error("Unknown API error");
        }
        if (!userRes.users[0]) {
            throw new Error("User not found");
        }
        const user: GatariUserResponse = userRes.users[0];
        return await this.getUserInternal(user, mode);
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<APIScore[]> {
        const user = await this.getUser(nickname);
        return await this.getUserTopById(user.id as number, mode, limit);
    }

    async getUserTopById(id: number | string, mode?: number, limit: number = 3): Promise<APIScore[]> {
        const { data } = await this.api.get(`/user/scores/best?${qs.stringify({ id, mode, p: 1, l: limit })}`);
        if (!data.scores) {
            throw new Error("No scores");
        }
        return data.scores.map((s) => new GatariTopScore(s));
    }

    async getUserRecent(nickname: string, mode: number = 0, limit: number = 1): Promise<APIScore> {
        const user = await this.getUser(nickname);
        return await this.getUserRecentById(user.id as number, mode, limit);
    }

    async getUserRecentById(id: number | string, mode: number = 0, limit: number = 1): Promise<APIScore> {
        const { data } = await this.api.get(`/user/scores/recent?${qs.stringify({ id, mode, p: 1, l: limit, f: 1 })}`);
        if (!data.scores[0]) {
            throw new Error("No scores");
        }
        return new GatariRecentScore(data.scores[0]);
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0): Promise<APIScore> {
        const user = await this.getUser(nickname);
        return await this.getScoreByUid(user.id as number, beatmapId, mode);
    }

    async getScoreByUid(uid: number | string, beatmapId: number, mode: number = 0): Promise<APIScore> {
        if (mode > 1) {
            throw new Error("Mode is not supported");
        }
        const { data } = await this.api.get(`/beatmap/user/score?${qs.stringify({ b: beatmapId, u: uid, mode })}`);
        if (!data.score) {
            throw new Error("No score");
        }
        return new GatariScore(data.score, beatmapId);
    }

    async getLeaderboard(beatmapId: number, users: IDatabaseUser[], mode: number = 0): Promise<LeaderboardResponse> {
        const map = await this.beatmapProvider.getBeatmapById(beatmapId, mode);
        const scores: LeaderboardScore[] = [];
        try {
            const lim = Math.ceil(users.length / 5);
            for (let i = 0; i < lim; i++) {
                try {
                    const usrs = users.splice(0, 5);
                    const usPromise = usrs.map((u) => this.getScoreByUid(u.game_id, beatmapId, mode));
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
                    // ignore
                }
            } // Ignore "No scores"

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
