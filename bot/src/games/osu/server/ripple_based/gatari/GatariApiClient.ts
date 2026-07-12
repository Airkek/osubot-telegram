import { HitCounts } from "games/scores/HitCounts";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IGameUserGradeCounts } from "games/users/IGameUserGradeCounts";
import { IGameApi } from "games/IGameApi";
import * as axios from "axios";
import qs from "querystring";
import { Mods } from "games/osu/performance/Mods";
import { Util } from "shared/Util";
import { InvalidGameModeError } from "core/errors/InvalidGameModeError";
import { NoRecentScoresError } from "core/errors/NoRecentScoresError";
import { NoScoresFoundError } from "core/errors/NoScoresFoundError";
import { NoTopScoresError } from "core/errors/NoTopScoresError";
import { UserNotFoundError } from "core/errors/UserNotFoundError";

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

class GatariUser implements IGameUser {
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
    grades?: IGameUserGradeCounts;
    total_score: number;
    profileAvatarUrl: string;
    profileBackgroundUrl?: string;
    constructor(user: GatariUserResponse, stats: GatariStatsResponse, mode: number, profileBackgroundUrl?: string) {
        if (!user || !stats || !Number.isFinite(Number(user.id)) || typeof user.username !== "string") {
            throw new Error("Invalid user response from Gatari API");
        }
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
        this.profileBackgroundUrl = profileBackgroundUrl;

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

class GatariTopScore implements IGameScore {
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
        if (!score?.beatmap || typeof score.ranking !== "string") {
            throw new Error("Invalid top score response from Gatari API");
        }
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

class GatariRecentScore implements IGameScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data) {
        if (!data?.beatmap || typeof data.ranking !== "string") {
            throw new Error("Invalid recent score response from Gatari API");
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

class GatariScore implements IGameScore {
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
        if (!data || typeof data.rank !== "string") {
            throw new Error("Invalid user score response from Gatari API");
        }
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

export class GatariApiClient implements IGameApi {
    readonly supportsScoreMods = true;
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://osugatari.ru/api/v2",
            timeout: 15000,
        });
    }

    private async getUserBackground(user: GatariUserResponse): Promise<string | undefined> {
        try {
            const { data } = await this.api.get(
                `/users/lookup?${qs.stringify({
                    username: user.username,
                })}`,
                { timeout: 5000 }
            );
            const match = Array.isArray(data?.result)
                ? data.result.find((result) => Number(result?.id) === Number(user.id))
                : undefined;
            return typeof match?.background === "string"
                ? new URL(match.background, "https://osugatari.ru").toString()
                : undefined;
        } catch {
            return undefined;
        }
    }

    private async getUserInternal(user: GatariUserResponse, mode?: number): Promise<IGameUser> {
        const realMode = mode == undefined ? user.favourite_mode : mode;
        const [{ data: stats }, profileBackgroundUrl] = await Promise.all([
            this.api.get(
                `/user/stats?${qs.stringify({
                    id: user.id,
                    mode: realMode,
                })}`
            ),
            this.getUserBackground(user),
        ]);
        if (stats?.code !== 200 || !stats.stats) {
            throw new Error(stats?.error || "Unknown API error");
        }
        return new GatariUser(user, stats.stats, realMode, profileBackgroundUrl);
    }

    async getUser(nickname: string, mode: number = 0): Promise<IGameUser> {
        const { data: userRes } = await this.api.get(`/users/get?${qs.stringify({ u: nickname })}`);
        if (userRes?.code !== 200) {
            throw new Error(userRes?.error || "Unknown API error");
        }
        if (!Array.isArray(userRes.users) || !userRes.users[0]) {
            throw new UserNotFoundError();
        }
        const user: GatariUserResponse = userRes.users[0];
        return await this.getUserInternal(user, mode);
    }

    async getUserById(id: number | string, mode?: number): Promise<IGameUser> {
        const { data: userRes } = await this.api.get(`/users/get?${qs.stringify({ id })}`);
        if (userRes?.code !== 200) {
            throw new Error(userRes?.error || "Unknown API error");
        }
        if (!Array.isArray(userRes.users) || !userRes.users[0]) {
            throw new UserNotFoundError();
        }
        const user: GatariUserResponse = userRes.users[0];
        return await this.getUserInternal(user, mode);
    }

    async getUserTop(nickname: string, mode: number = 0, limit: number = 3): Promise<IGameScore[]> {
        const user = await this.getUser(nickname, mode);
        return await this.getUserTopById(user.id as number, mode, limit);
    }

    async getUserTopById(id: number | string, mode?: number, limit: number = 3): Promise<IGameScore[]> {
        const { data } = await this.api.get(`/user/scores/best?${qs.stringify({ id, mode, p: 1, l: limit })}`);
        if (data?.code !== 200) {
            throw new Error(data?.error || "Unknown API error");
        }
        if (!Array.isArray(data?.scores) || data.scores.length === 0) {
            throw new NoTopScoresError("No scores");
        }
        return data.scores.map((s) => new GatariTopScore(s));
    }

    async getUserRecent(nickname: string, mode: number = 0, limit: number = 1): Promise<IGameScore> {
        const user = await this.getUser(nickname, mode);
        return await this.getUserRecentById(user.id as number, mode, limit);
    }

    async getUserRecentById(id: number | string, mode: number = 0, limit: number = 1): Promise<IGameScore> {
        const { data } = await this.api.get(`/user/scores/recent?${qs.stringify({ id, mode, p: 1, l: limit, f: 1 })}`);
        if (data?.code !== 200) {
            throw new Error(data?.error || "Unknown API error");
        }
        if (!Array.isArray(data?.scores) || !data.scores[0]) {
            throw new NoRecentScoresError("No scores");
        }
        return new GatariRecentScore(data.scores[0]);
    }

    async getScore(nickname: string, beatmapId: number, mode: number = 0, mods?: Mods): Promise<IGameScore> {
        const user = await this.getUser(nickname, mode);
        return await this.getScoreByUid(user.id as number, beatmapId, mode, mods);
    }

    async getScoreByUid(uid: number | string, beatmapId: number, mode: number = 0, mods?: Mods): Promise<IGameScore> {
        if (!Number.isInteger(mode) || mode < 0 || mode > 3) {
            throw new InvalidGameModeError();
        }
        const query: Record<string, number | string> = { b: beatmapId, u: uid, mode };
        if (mods !== undefined) {
            query.m = mods.sum();
        }
        const { data } = await this.api.get(`/beatmap/user/score?${qs.stringify(query)}`);
        if (data?.code !== 200) {
            throw new Error(data?.error || "Unknown API error");
        }
        if (!data?.score) {
            throw new NoScoresFoundError("No score");
        }
        return new GatariScore(data.score, beatmapId);
    }
}
