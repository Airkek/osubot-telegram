import IAPI from "./base";
import * as axios from "axios";
import qs from "querystring";
import {
    APIBeatmap,
    APIScore,
    APIUser,
    IBeatmapObjects,
    IBeatmapStars,
    IBeatmapStats,
    ICustomHit,
    IHitCounts,
} from "../Types";
import Mods from "../osu_specific/pp/Mods";
import { BeatLeaderBeatmap } from "../beatmaps/beatsaber/BeatLeaderBeatmap";
import { ILocalisator } from "../ILocalisator";

interface BLUserResponse {
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

interface BLScoreData {
    playerId: string;
    modifiedScore: number;
    accuracy: number;
    rank: number;
    pp: number;
    fcPp: number;
    fullCombo: boolean;
    modifiers: string;
    badCuts: number;
    bombCuts: number;
    wallsHit: number;
    missedNotes: number;
    maxCombo: number;
    pauses: number;
    timepost: number;
    leaderboard: {
        id: string;
        song: {
            id: string;
            name: string;
            author: string;
            mapper: string;
            bpm: number;
            mapperId: number;
            fullCoverImage: string;
        };
        difficulty: {
            id: number;
            stars: number;
            difficultyName: string;
            mode: number;
            status: number;
            duration: number;
        };
    };
}

interface BLScoreResponse {
    data: BLScoreData[];
}

class BeatSaberUser implements APIUser {
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
    mode: number = -1;
    constructor(data: BLUserResponse) {
        this.id = data.id;
        this.nickname = data.name;
        this.playcount = data.scoreStats.totalPlayCount;
        this.pp = data.pp;
        this.rank = {
            total: data.rank,
            country: data.countryRank,
        };
        this.country = data.country;
        this.accuracy = data.scoreStats.averageRankedAccuracy * 100;
    }
}

class BeatLeaderScoreMap implements APIBeatmap {
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

    constructor(data: BLScoreData) {
        this.artist = data.leaderboard.song.author;
        this.id = {
            set: ~~data.leaderboard.song.id,
            map: data.leaderboard.difficulty.id,
            hash: `bl_${data.leaderboard.song.id}_${data.leaderboard.difficulty.id}`,
        };
        this.bpm = data.leaderboard.song.bpm;
        this.creator = {
            nickname: data.leaderboard.song.mapper,
            id: data.leaderboard.song.mapperId,
        };
        this.status = data.leaderboard.difficulty.status == 3 ? "Ranked" : "Unranked";
        this.stats = {
            ar: 0,
            cs: 0,
            od: 0,
            hp: 0,
        };
        this.diff = {
            stars: data.leaderboard.difficulty.stars,
        };
        this.objects = {
            circles: 0,
            sliders: 0,
            spinners: 0,
        };
        this.title = data.leaderboard.song.name;
        this.length = data.leaderboard.difficulty.duration;
        this.version = data.leaderboard.difficulty.difficultyName;
        this.combo = data.fullCombo ? data.maxCombo : undefined;
        this.mode = data.leaderboard.difficulty.mode;
        this.coverUrl = data.leaderboard.song.fullCoverImage;
        this.mapUrl = `https://beatleader.xyz/leaderboard/global/${data.leaderboard.id}`;
    }
}

interface IHitData {
    wallsHit: number;
    bombsHit: number;
    badCuts: number;
    missedNotes: number;
    pauses: number;
}

class BSHitCounts implements IHitCounts {
    hitData: IHitData;
    constructor(data: IHitData) {
        this.hitData = data;
    }
    totalHits(): number {
        return NaN;
    }
    toString(): string {
        return `${this.hitData.pauses}xPause ${this.hitData.wallsHit}xWall ${this.hitData.badCuts}xBad ${this.hitData.bombsHit}xBomb ${this.hitData.missedNotes}xMiss`;
    }
    getCountNames(l: ILocalisator): ICustomHit[] {
        return [
            {
                name: l.tr("score-pauses"),
                value: this.hitData.pauses,
            },
            {
                name: l.tr("score-walls"),
                value: this.hitData.wallsHit,
            },
            {
                name: l.tr("score-bad"),
                value: this.hitData.badCuts,
            },
            {
                name: l.tr("score-bombs"),
                value: this.hitData.bombsHit,
            },
            this.getMissLikeValue(l),
        ];
    }

    getMissLikeValue(l: ILocalisator): ICustomHit {
        return {
            name: l.tr("score-misses"),
            value: this.hitData.missedNotes,
        };
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
    beatmap?: BeatLeaderBeatmap;
    rank: string;
    date: Date;

    acc: number;

    constructor(data: BLScoreData) {
        this.beatmapId = ~~data.leaderboard.song.id;
        this.score = data.modifiedScore;
        this.combo = data.maxCombo;
        this.counts = new BSHitCounts({
            wallsHit: data.wallsHit,
            bombsHit: data.bombCuts,
            badCuts: data.badCuts,
            missedNotes: data.missedNotes,
            pauses: data.pauses,
        });
        this.mods = new Mods(""); // TODO: Implement mods
        this.acc = data.accuracy;
        this.pp = data.pp;
        this.fcPp = data.fcPp;
        this.rank = data.fullCombo ? "FC" : "Pass";
        this.date = new Date(data.timepost * 1000);
        this.mode = data.leaderboard.difficulty.mode;
        this.beatmap = new BeatLeaderBeatmap(new BeatLeaderScoreMap(data));
    }

    accuracy(): number {
        return this.acc;
    }
}

export default class BeatLeaderAPI implements IAPI {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://api.beatleader.xyz",
            timeout: 15000,
        });
    }

    async getUserById(id: string): Promise<APIUser> {
        const { data } = await this.api.get(`/player/${id}?stats=true&keepOriginalId=false`);
        return new BeatSaberUser(data);
    }

    async getUserRecentById(id: string, mode?: number, limit: number = 1): Promise<APIScore> {
        const data: BLScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sortBy: "date", order: "desc", page: 1, count: limit })}`
            )
        ).data;
        if (data && data.data && data.data[0]) {
            return new BeatSaberScore(data.data[0]);
        }

        throw new Error("No recent scores");
    }

    async getUserTopById(id: string, mode?: number, limit: number = 3): Promise<APIScore[]> {
        const data: BLScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sortBy: "pp", order: "desc", page: 1, count: limit })}`
            )
        ).data;
        if (data && data.data && data.data.length > 0) {
            return data.data.map((scoreData: BLScoreData) => new BeatSaberScore(scoreData));
        }

        throw new Error("No top scores");
    }
}
