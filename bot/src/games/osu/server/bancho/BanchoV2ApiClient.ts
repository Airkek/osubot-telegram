import { IBeatmapData } from "games/beatmaps/IBeatmapData";
import { IBeatmapDataStats } from "games/beatmaps/IBeatmapDataStats";
import { IBeatmapObjectData } from "games/beatmaps/IBeatmapObjectData";
import { IBeatmapStarData } from "games/beatmaps/IBeatmapStarData";
import { HitCounts } from "games/scores/HitCounts";
import { IGameScore } from "games/scores/IGameScore";
import { IGameUser } from "games/users/IGameUser";
import { IGameUserGradeCounts } from "games/users/IGameUserGradeCounts";
import { IRankedPlayStatistics } from "games/users/IRankedPlayStatistics";
import { BeatmapStatus } from "games/osu/BeatmapStatus";
import { IBeatmapsetSearchResult } from "games/osu/search/IBeatmapsetSearchResult";
import * as axios from "axios";
import qs from "querystring";
import { Mods } from "games/osu/performance/Mods";
import { IExtendedMod } from "games/osu/performance/IExtendedMod";
import { IGameApi } from "games/IGameApi";
import { IScoreRequestOptions } from "games/IScoreRequestOptions";
import { BeatmapNotFoundError } from "core/errors/BeatmapNotFoundError";
import { NoRecentScoresError } from "core/errors/NoRecentScoresError";
import { NoScoresFoundError } from "core/errors/NoScoresFoundError";
import { NoTopScoresError } from "core/errors/NoTopScoresError";
import { ReplayNotAvailableError } from "core/errors/ReplayNotAvailableError";
import { UserNotFoundError } from "core/errors/UserNotFoundError";
import { UserStatisticsUnavailableError } from "core/errors/UserStatisticsUnavailableError";

type Ruleset = "osu" | "mania" | "taiko" | "fruits";

interface BeatmapsetsArguments {
    query?: string;
    status?: string;
    limit?: number;
}

interface Score {
    id: number;
    mods: IExtendedMod[];
    accuracy: number;
    statistics: {
        great: number;
        ok: number;
        miss: number;
        meh: number;

        // mania:
        perfect?: number; // geki
        good?: number; // katu

        // std lazer slider stats:
        large_tick_hit?: number;
        large_tick_miss?: number;
        small_tick_hit?: number;
        small_tick_miss?: number;
        slider_tail_hit?: number;
    };
    ruleset_id: number;
    ended_at: string;
    pp?;
    rank: string;
    total_score: number;
    legacy_total_score: number;
    max_combo: number;
    beatmap: {
        id: number;
    };
    passed: boolean;
    rank_global?: number;
    processed?: boolean;
    preserve?: boolean;
    ranked?: boolean;
    user_id?: number;

    has_replay: boolean;
}

interface Beatmap {
    beatmapset_id: number;
    difficulty_rating: number;
    id: number;
    mode: Ruleset;
    status: string;
    total_length: number;
    user_id: number;
    version: string;
    beatmapset: Beatmapset;
    checksum: string;
}

interface BeatmapExtended extends Beatmap {
    accuracy: number;
    ar: number;
    bpm?: number;
    convert: boolean;
    count_circles: number;
    count_sliders: number;
    count_spinners: number;
    cs: number;
    deleted_at?: string;
    drain: number;
    hit_length: number;
    is_scoreable: boolean;
    last_updated: string;
    mode_int: number;
    passcount: number;
    playcount: number;
    ranked: BeatmapStatus;
    url: string;
    max_combo: number;
}

interface UserStats {
    count_100: number;
    count_300: number;
    count_50: number;
    count_miss: number;
    country_rank?: number;
    grade_counts: {
        a: number;
        s: number;
        sh: number;
        ss: number;
        ssh: number;
    };
    hit_accuracy: number;
    is_ranked: boolean;
    level: {
        current: number;
        progress: number;
    };
    maximum_combo: number;
    play_count: number;
    play_time: number;
    pp: number;
    pp_exp: number;
    global_rank?: number;
    global_rank_exp?: number;
    ranked_score: number;
    replays_watched_by_others: number;
    total_hits: number;
    total_score: number;
}

interface User {
    avatar_url: string;
    country_code: string;
    default_group?: string;
    id: number;
    is_active: boolean;
    is_bot: boolean;
    is_deleted: boolean;
    is_online: boolean;
    is_supporter: boolean;
    last_visit?: string;
    pm_friends_only: boolean;
    profile_colour?: string;
    username: string;
    statistics?: UserStats;
    playmode: Ruleset;
    cover?: ProfileCover;
    matchmaking_stats?: MatchmakingStatistics[];
}

interface MatchmakingPool {
    name: string;
    active: boolean;
    ruleset_id: number;
}

interface MatchmakingStatistics {
    pool_id: number;
    rating: number;
    rank?: number;
    plays: number;
    first_placements: number;
    is_rating_provisional: boolean;
    pool: MatchmakingPool;
}

interface BeatmapCovers {
    cover?: string;
    "cover@2x"?: string;
    card?: string;
    "card@2x"?: string;
    list?: string;
    "list@2x"?: string;
    slimcover?: string;
    "slimcover@2x"?: string;
}

interface ProfileCover {
    custom_url: string; // ?
    url: string;
    id?: string; // ?
}

interface Beatmapset {
    artist?: string;
    artist_unicode?: string;
    covers?: BeatmapCovers;
    creator?: string;
    favourite_count?: number;
    id: number;
    nsfw?: boolean;
    offset?: number;
    play_count?: number;
    preview_url?: string;
    source?: string;
    status?: string;
    spotlight?: boolean;
    title?: string;
    title_unicode?: string;
    user_id?: number;
    video?: boolean;
}

class V2Beatmap implements IBeatmapData {
    artist: string;
    id: { set: number; map: number; hash: string };
    bpm: number;
    creator: { nickname: string; id: number };
    status: string;
    stats: IBeatmapDataStats;
    diff: IBeatmapStarData;
    objects: IBeatmapObjectData;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;
    coverUrl: string;

    constructor(beatmap: BeatmapExtended) {
        if (!beatmap?.beatmapset || !beatmap.beatmapset.covers) {
            throw new Error("Invalid beatmap response from osu! API");
        }
        this.artist = beatmap.beatmapset.artist;
        this.id = {
            set: beatmap.beatmapset_id,
            map: beatmap.id,
            hash: beatmap.checksum,
        };

        this.bpm = beatmap.bpm;
        this.length = beatmap.hit_length;

        this.creator = {
            nickname: beatmap.beatmapset.creator,
            id: beatmap.beatmapset.user_id,
        };
        this.status = BeatmapStatus[Number(beatmap.ranked)];
        this.stats = {
            ar: beatmap.ar,
            cs: beatmap.cs,
            od: beatmap.accuracy,
            hp: beatmap.drain,
        };
        this.diff = {
            stars: 0, // deprecated
        };
        this.objects = {
            circles: beatmap.count_circles,
            sliders: beatmap.count_sliders,
            spinners: beatmap.count_spinners,
        };
        this.title = beatmap.beatmapset.title;
        this.version = beatmap.version;
        this.combo = beatmap.max_combo;
        this.mode = beatmap.mode_int;
        this.coverUrl = beatmap.beatmapset.covers["cover@2x"];
    }
}

interface BeatmapUserScore {
    position: number;
    score: Score;
}

interface BeatmapUserScores {
    scores: Score[];
}

class V2Score implements IGameScore {
    api_score_id: number;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    pp: number;
    date: Date;
    rank_global?: number;
    v2_acc: number;
    top100_number?: number;
    player_id: number;
    has_replay: boolean;
    constructor(data: Score, forceLazerScore = false) {
        if (!data?.beatmap || !data.statistics || !Array.isArray(data.mods)) {
            throw new Error("Invalid score response from osu! API");
        }
        this.api_score_id = data.id;
        this.beatmapId = data.beatmap.id;
        this.score = forceLazerScore || !data.legacy_total_score ? data.total_score : data.legacy_total_score;
        this.combo = data.max_combo;
        this.counts = new HitCounts(
            {
                300: data.statistics.great || 0,
                100: data.ruleset_id === 2 ? data.statistics.large_tick_hit || 0 : data.statistics.ok || 0,
                50: data.ruleset_id === 2 ? data.statistics.small_tick_hit || 0 : data.statistics.meh || 0,
                miss: data.statistics.miss || 0,
                katu: data.ruleset_id === 2 ? data.statistics.small_tick_miss || 0 : data.statistics.good || 0,
                geki: data.statistics.perfect || 0,
                slider_large: data.statistics.large_tick_hit || 0,
                slider_tail: data.statistics.slider_tail_hit || 0,
                small_tick_miss: data.statistics.small_tick_miss || 0,
                large_tick_miss: data.statistics.large_tick_miss || 0,
            },
            data.ruleset_id
        );
        this.mods = new Mods(data.mods as IExtendedMod[]);
        this.rank = data.passed ? data.rank : "F";
        this.rank_global = data.rank_global;
        this.mode = data.ruleset_id;
        this.date = new Date(data.ended_at);
        this.pp = data.pp;
        this.v2_acc = data.accuracy;
        this.player_id = data.user_id;
        this.has_replay = data.has_replay;
    }

    accuracy() {
        return this.v2_acc;
    }
}

class V2User implements IGameUser {
    id: number;
    nickname: string;
    playcount: number;
    playtime: number;
    pp: number;
    rank: { total: number; country: number };
    country: string;
    accuracy: number;
    level: number;
    levelProgress: number;
    mode: number;
    grades?: IGameUserGradeCounts;
    is_supporter: boolean;
    profileAvatarUrl: string;
    profileBackgroundUrl?: string;
    total_score?: number;
    rankedPlay?: IRankedPlayStatistics;

    constructor(data: User, mode?: number) {
        if (!data?.statistics?.level) {
            throw new Error("Invalid user response from osu! API");
        }
        this.id = data.id;
        this.nickname = data.username;
        this.playcount = data.statistics.play_count;
        this.playtime = data.statistics.play_time;
        this.pp = data.statistics.pp;
        this.rank = {
            total: data.statistics.global_rank,
            country: data.statistics.country_rank,
        };
        this.country = data.country_code;
        this.accuracy = data.statistics.hit_accuracy;
        this.level = data.statistics.level.current;
        this.levelProgress = data.statistics.level.progress;
        this.mode = mode ?? getRulesetId(data.playmode);
        this.profileAvatarUrl = data.avatar_url;
        this.profileBackgroundUrl = data.cover?.url;
        this.grades = data.statistics?.grade_counts;
        this.is_supporter = data.is_supporter;
        this.total_score = data.statistics?.total_score;

        const activeRankedPlay = data.matchmaking_stats
            ?.filter((statistics) => statistics.pool.active && statistics.pool.ruleset_id === this.mode)
            .sort((left, right) => {
                const rankDifference = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER);
                return rankDifference || right.rating - left.rating || right.pool_id - left.pool_id;
            })[0];
        if (activeRankedPlay) {
            this.rankedPlay = {
                poolName: activeRankedPlay.pool.name,
                rating: activeRankedPlay.rating,
                rank: activeRankedPlay.rank,
                plays: activeRankedPlay.plays,
                wins: activeRankedPlay.first_placements,
                provisional: activeRankedPlay.is_rating_provisional,
            };
        }
    }
}

const getRuleset = (mode: number): Ruleset => {
    let ruleset: Ruleset = "osu";
    switch (mode) {
        case 0:
            ruleset = "osu";
            break;
        case 1:
            ruleset = "taiko";
            break;
        case 2:
            ruleset = "fruits";
            break;
        case 3:
            ruleset = "mania";
            break;
    }
    return ruleset;
};

const getRulesetId = (ruleset: Ruleset | string): number => {
    let mode = 0;
    switch (ruleset) {
        case "osu":
            mode = 0;
            break;
        case "taiko":
            mode = 1;
            break;
        case "fruits":
            mode = 2;
            break;
        case "mania":
            mode = 3;
            break;
    }
    return mode;
};

export class BanchoV2ApiClient implements IGameApi {
    readonly supportsScoreMods = true;
    api: axios.AxiosInstance;
    logged: number;
    token?: string;
    app_id: number;
    client_secret: string;
    constructor(appId: number, clientSecret: string) {
        this.api = axios.default.create({
            baseURL: "https://osu.ppy.sh/api/v2",
            timeout: 15000,
        });
        this.app_id = appId;
        this.client_secret = clientSecret;

        this.logged = 0;
    }

    async login(): Promise<void> {
        try {
            const { data } = await axios.default.post(
                "https://osu.ppy.sh/oauth/token",
                {
                    grant_type: "client_credentials",
                    client_id: this.app_id,
                    client_secret: this.client_secret,
                    scope: "public",
                },
                { timeout: 15000 }
            );
            if (typeof data?.access_token !== "string" || !data.access_token) {
                throw new Error("osu! OAuth response does not contain an access token");
            }
            this.token = data.access_token;
            this.logged = 1;
        } catch (error) {
            this.logged = -1;
            throw error;
        }
    }

    private async getArrayBuffer(method: string, query?, retryAuthentication = true) {
        try {
            const { data } = await this.api.get(`${method}${query ? `?${qs.stringify(query)}` : ""}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "x-api-version": "20241130",
                },
                responseType: "arraybuffer",
            });
            return data;
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401 && retryAuthentication) {
                await this.refresh();
                return this.getArrayBuffer(method, query, false);
            }
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return undefined;
            }
            throw e;
        }
    }

    private async get(method: string, query?, retryAuthentication = true) {
        try {
            const { data } = await this.api.get(`${method}${query ? `?${qs.stringify(query)}` : ""}`, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "x-api-version": "20241130",
                },
            });
            return data;
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401 && retryAuthentication) {
                await this.refresh();
                return this.get(method, query, false);
            }
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return undefined;
            }
            throw e;
        }
    }

    private async post(method: string, query?, retryAuthentication = true) {
        try {
            const { data } = await this.api.post(`${method}`, query, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "x-api-version": "20241130",
                },
            });
            return data;
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 401 && retryAuthentication) {
                await this.refresh();
                return this.post(method, query, false);
            }
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                return undefined;
            }
            throw e;
        }
    }

    async refresh() {
        if (this.logged != 1) {
            throw new Error("Not logged in");
        }
        return await this.login();
    }

    async getUser(nickname: string, mode?: number): Promise<IGameUser> {
        const user = encodeURIComponent(`@${nickname}`);
        const ruleset = mode !== undefined ? `/${getRuleset(mode)}` : "";
        const data = await this.get(`/users/${user}${ruleset}`);

        if (data === undefined) {
            throw new UserNotFoundError();
        }
        if (!data?.statistics) {
            throw new UserStatisticsUnavailableError();
        }

        return new V2User(data, mode);
    }

    async getUserById(id: number | string, mode?: number): Promise<IGameUser> {
        const user = encodeURIComponent(String(id));
        const ruleset = mode !== undefined ? `/${getRuleset(mode)}` : "";
        const data = await this.get(`/users/${user}${ruleset}`);

        if (data === undefined) {
            throw new UserNotFoundError();
        }
        if (!data?.statistics) {
            throw new UserStatisticsUnavailableError();
        }

        return new V2User(data, mode);
    }

    async getUserRecent(nickname: string, mode?: number, limit?: number): Promise<IGameScore> {
        const user = await this.getUser(nickname);
        return await this.getUserRecentById(user.id as number, mode, limit);
    }

    async getUserTop(nickname: string, mode?: number, limit?: number): Promise<IGameScore[]> {
        const user = await this.getUser(nickname);
        return await this.getUserTopById(user.id as number, mode, limit);
    }

    async getScore(nickname: string, beatmapId: number, mode?: number, mods?: number): Promise<IGameScore> {
        const user = await this.getUser(nickname);
        return await this.getScoreByUid(user.id as number, beatmapId, mode, mods);
    }

    async getBeatmap(id: number | string): Promise<IBeatmapData> {
        let data: BeatmapExtended;

        if (typeof id === "string") {
            data = await this.get("/beatmaps/lookup", {
                checksum: id,
            });
        } else {
            data = await this.get(`/beatmaps/${id}`);
        }

        if (data === undefined) {
            throw new BeatmapNotFoundError();
        }
        if (!data?.beatmapset) {
            throw new Error("Invalid beatmap response from osu! API");
        }

        return new V2Beatmap(data);
    }

    async getBeatmapsets(args: BeatmapsetsArguments): Promise<IBeatmapsetSearchResult[]> {
        const data = await this.get("/beatmapsets/search/", {
            q: args.query || null,
            s: args.status || "ranked",
        });
        if (!Array.isArray(data?.beatmapsets)) {
            throw new Error("Invalid beatmap search response from osu! API");
        }
        if (data.beatmapsets.some((set) => !Array.isArray(set?.beatmaps))) {
            throw new Error("Invalid beatmap search response from osu! API");
        }
        return data.beatmapsets.map((set) => ({
            id: set.id,
            title: set.title,
            artist: set.artist,
            rankedDate: new Date(set.ranked_date),
            creator: set.creator,
            status: set.status,
            beatmaps: set.beatmaps.map((map) => ({
                id: map.id,
                mode: map.mode_int,
                stars: map.difficulty_rating,
                version: map.version,
            })),
        }));
    }

    async getUserRecentById(uid: number | string, mode: number, limit: number = 1): Promise<IGameScore> {
        const data = await this.get(`/users/${uid}/scores/recent`, {
            mode: getRuleset(mode),
            include_fails: true,
            limit,
        });

        if (!Array.isArray(data)) {
            throw new Error("Invalid recent scores response from osu! API");
        }
        if (data[0]) {
            const score = data[0];

            let fullInfo: Score = score;
            if (fullInfo.passed) {
                try {
                    fullInfo = await this.getScoreByScoreId_internal(score.id, !!score.legacy_total_score);
                } catch {
                    // ignore
                }
            }

            const result = new V2Score(fullInfo);
            if (fullInfo.preserve && fullInfo.ranked) {
                try {
                    const topscores = await this.getUserTopById(uid, mode, 100);
                    for (let i = topscores.length - 1; i >= 0; i--) {
                        const topScore = topscores[i];
                        if (topScore.api_score_id == score.id) {
                            result.top100_number = i + 1;
                            break;
                        }
                        if (topScore.pp > score.pp) {
                            break;
                        }
                    }
                } catch {
                    // ignore
                }
            }

            return result;
        }
        throw new NoRecentScoresError();
    }

    async getUserTopById(uid: number | string, mode: number = 0, limit: number = 3): Promise<IGameScore[]> {
        const data = await this.get(`/users/${uid}/scores/best`, {
            mode: getRuleset(mode),
            limit,
        });

        if (!Array.isArray(data)) {
            throw new Error("Invalid top scores response from osu! API");
        }
        if (data[0]) {
            return data.map((s, index) => {
                const score = new V2Score(s);
                score.top100_number = index + 1;
                return score;
            });
        }

        throw new NoTopScoresError();
    }

    async getScoreByUid(
        uid: number | string,
        beatmapId: number,
        mode?: number,
        mods?: number,
        options: IScoreRequestOptions = {}
    ): Promise<IGameScore> {
        if (mods === 0) {
            const data: BeatmapUserScores = await this.get(`/beatmaps/${beatmapId}/scores/users/${uid}/all`, {
                ruleset: getRuleset(mode),
            });
            if (!data) {
                throw new NoScoresFoundError();
            }
            if (!Array.isArray(data.scores)) {
                throw new Error("Invalid user scores response from osu! API");
            }
            const score = data.scores.find((candidate) => new Mods(candidate.mods).sum() === 0);
            if (!score) {
                throw new NoScoresFoundError();
            }
            return new V2Score(score, options.forceLazerScore);
        }

        const query: Record<string, string | string[]> = {
            mode: getRuleset(mode),
        };
        if (mods !== undefined && mods !== null) {
            query["mods[]"] = new Mods(mods).toAcronymList(true).filter((mod) => mod !== "CL");
        }

        const data: BeatmapUserScore = await this.get(`/beatmaps/${beatmapId}/scores/users/${uid}`, query);

        if (!data) {
            throw new NoScoresFoundError();
        }
        if (!data.score) {
            throw new Error("Invalid user score response from osu! API");
        }

        return new V2Score(data.score, options.forceLazerScore);
    }

    async getScoreByScoreId(scoreId: number | string, legacyOnly = false): Promise<V2Score> {
        const data = await this.getScoreByScoreId_internal(scoreId, legacyOnly);
        return new V2Score(data);
    }

    async downloadReplay(scoreId: number | string): Promise<Buffer> {
        const data = await this.getArrayBuffer(`/scores/${scoreId}/download`);
        if (!data) {
            throw new ReplayNotAvailableError();
        }
        const buffer = Buffer.from(data, "binary");

        return buffer;
    }

    private async getScoreByScoreId_internal(scoreId: number | string, legacyOnly = false): Promise<Score> {
        const data: Score = await this.get(`/scores/${scoreId}`, {
            legacy_only: legacyOnly,
        });

        if (!data) {
            throw new NoScoresFoundError();
        }

        return data;
    }
}
