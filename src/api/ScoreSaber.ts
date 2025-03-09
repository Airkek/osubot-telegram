import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import { APIBeatmap, APIScore, APIUser, IBeatmapObjects, IBeatmapStars, IBeatmapStats, IHitCounts } from "../Types";
import Mods from "../osu_specific/pp/Mods";
import { ScoreSaberBeatmap } from "../beatmaps/beatsaber/ScoreSaberBeatmap";

interface SSUserResponse {
    scoreStats: {
        averageRankedAccuracy: number;
        totalPlayCount: number;
    };
    id: string;
    name: string;
    country: string;
    pp: number;
    rank: number;
    countryRank: number;
}

interface SSScoreData {
    score: {
        timeSet: string;
        baseScore: number;
        modifiedScore: number;
        accuracy: number;
        rank: number;
        pp: number;
        fullCombo: boolean;
        modifiers: string;
        badCuts: number;
        missedNotes: number;
        maxCombo: number;
    };
    leaderboard: {
        id: string;
        songName: string;
        songAuthorName: string;
        levelAuthorName: string;
        maxScore: number;
        coverImage: string;
        difficulty: {
            difficultyRaw: string;
        };
        ranked: boolean;
        loved: boolean;
        qualified: boolean;
        positiveModifiers: boolean;
        stars: number;
    };
}

interface SSScoreResponse {
    playerScores: SSScoreData[];
}

class ScoreSaberUser implements APIUser {
    id: string;
    nickname: string;
    playcount: number;
    pp: number;
    rank: {
        total: number;
        country: number;
    };
    country: string;
    accuracy: number;
    constructor(data: SSUserResponse) {
        this.id = data.id;
        this.nickname = data.name;
        this.playcount = data.scoreStats.totalPlayCount;
        this.pp = data.pp;
        this.rank = {
            total: data.rank,
            country: data.countryRank,
        };
        this.country = data.country;
        this.accuracy = data.scoreStats.averageRankedAccuracy;
    }
}

interface IRankedStatus {
    ranked: boolean;
    loved: boolean;
    qualified: boolean;
    positiveModifiers: boolean;
}
function getStatus(data: IRankedStatus) {
    let t = "Unranked";
    if (data.ranked) {
        t = "Ranked";
    } else if (data.loved) {
        t = "Loved";
    } else if (data.qualified) {
        t = "Qualified";
    }

    if (data.positiveModifiers) {
        t += "+";
    }

    return t;
}

class ScoreSaberScoreMap implements APIBeatmap {
    artist: string;
    id: { set: number; map: number; hash: string };
    bpm: number;
    creator: { nickname: string; id: number };
    status: string;
    stats: IBeatmapStats;
    diff: IBeatmapStars;
    objects: IBeatmapObjects;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;
    coverUrl: string;
    mapUrl: string;

    constructor(data: SSScoreData) {
        this.artist = data.leaderboard.songAuthorName;
        this.id = {
            set: 0,
            map: 0,
            hash: "ss_0_0",
        };
        this.bpm = NaN;
        this.creator = {
            nickname: data.leaderboard.levelAuthorName,
            id: 0,
        };
        this.status = getStatus(data.leaderboard);
        this.stats = {
            ar: 0,
            cs: 0,
            od: 0,
            hp: 0,
        };
        this.diff = {
            stars: data.leaderboard.stars,
        };
        this.objects = {
            circles: 0,
            sliders: 0,
            spinners: 0,
        };
        this.title = data.leaderboard.songName;
        this.length = NaN;
        this.version = data.leaderboard.difficulty.difficultyRaw;
        this.combo = data.score.fullCombo ? data.score.maxCombo : undefined;
        this.mode = 0;
        this.coverUrl = data.leaderboard.coverImage;
        this.mapUrl = `https://scoresaber.com/leaderboard/${data.leaderboard.id}`;
    }
}

interface IHitData {
    badCuts: number;
    missedNotes: number;
}

class BSHitCounts implements IHitCounts {
    300: number;
    100: number;
    50: number;
    miss: number;

    hitData: IHitData;
    constructor(data: IHitData) {
        this.hitData = data;
    }
    accuracy(): number {
        return NaN;
    }
    totalHits(): number {
        return NaN;
    }
    toString(): string {
        return `${this.hitData.badCuts}xBad ${this.hitData.missedNotes}xMiss`;
    }
}

class BeatSaberScore implements APIScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: IHitCounts;
    mods: Mods;
    mode: number;
    pp?: number;
    fcPp?: number;
    beatmap?: ScoreSaberBeatmap;
    rank: string;
    date: Date;

    acc: number;

    constructor(data: SSScoreData) {
        this.beatmapId = 0;
        this.score = data.score.modifiedScore;
        this.combo = data.score.maxCombo;
        this.counts = new BSHitCounts({
            badCuts: data.score.badCuts,
            missedNotes: data.score.missedNotes,
        });
        this.mods = new Mods(""); // TODO: Implement mods
        this.acc = data.score.baseScore / data.leaderboard.maxScore;
        this.pp = data.score.pp;
        this.fcPp = data.score.pp;
        this.rank = data.score.fullCombo ? "FC" : "Pass";
        this.date = new Date(data.score.timeSet);
        this.mode = 0;
        this.beatmap = new ScoreSaberBeatmap(new ScoreSaberScoreMap(data));
    }

    accuracy(): number {
        return this.acc;
    }
}

export default class ScoreSaberAPI implements IAPI {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://scoresaber.com/api",
            timeout: 3000,
        });
    }

    async getUserById(id: string): Promise<APIUser> {
        const { data } = await this.api.get(`/player/${id}/full`);
        return new ScoreSaberUser(data);
    }

    async getUserRecentById(id: string, mode?: number, limit: number = 1): Promise<APIScore> {
        const data: SSScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sort: "recent", page: 1, limit, withMetadata: true })}`
            )
        ).data;
        if (data && data.playerScores && data.playerScores[0]) {
            return new BeatSaberScore(data.playerScores[0]);
        }

        throw new Error("No recent scores");
    }

    async getUserTopById(id: string, mode?: number, limit: number = 3): Promise<APIScore[]> {
        const data: SSScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sort: "top", page: 1, limit, withMetadata: true })}`
            )
        ).data;
        if (data && data.playerScores && data.playerScores.length > 0) {
            return data.playerScores.map((scoreData: SSScoreData) => new BeatSaberScore(scoreData));
        }

        throw new Error("No top scores");
    }
}
