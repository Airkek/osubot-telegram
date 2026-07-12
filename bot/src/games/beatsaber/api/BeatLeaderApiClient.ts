import { IBeatmapData } from "games/beatmaps/IBeatmapData";
import { IBeatmapDataStats } from "games/beatmaps/IBeatmapDataStats";
import { IBeatmapObjectData } from "games/beatmaps/IBeatmapObjectData";
import { IBeatmapStarData } from "games/beatmaps/IBeatmapStarData";
import { IDisplayHitCount } from "games/scores/IDisplayHitCount";
import { IGameScore } from "games/scores/IGameScore";
import { IHitCounts } from "games/scores/IHitCounts";
import { IGameUser } from "games/users/IGameUser";
import { IGameApi } from "games/IGameApi";
import * as axios from "axios";
import qs from "querystring";
import { NoRecentScoresError } from "core/errors/NoRecentScoresError";
import { NoTopScoresError } from "core/errors/NoTopScoresError";
import { UserNotFoundError } from "core/errors/UserNotFoundError";
import { Mods } from "games/osu/performance/Mods";
import { BeatLeaderBeatmap } from "games/beatsaber/beatmaps/BeatLeaderBeatmap";
import { ILocalizer } from "localization/ILocalizer";

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

class BeatSaberUser implements IGameUser {
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
        if (!data?.id || !data.scoreStats) {
            throw new Error("Invalid player response from BeatLeader API");
        }
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

class BeatLeaderScoreMap implements IBeatmapData {
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
    mapUrl: string;

    constructor(data: BLScoreData) {
        if (!data?.leaderboard?.song || !data.leaderboard.difficulty) {
            throw new Error("Invalid score response from BeatLeader API");
        }
        const rawSongId = data.leaderboard.song.id;
        const songId =
            typeof rawSongId === "string" && /^[0-9a-z]+$/i.test(rawSongId) ? Number.parseInt(rawSongId, 36) : NaN;
        const difficultyId = Number(data.leaderboard.difficulty.id);
        if (!Number.isSafeInteger(songId) || songId <= 0 || !Number.isSafeInteger(difficultyId) || difficultyId <= 0) {
            throw new Error("Invalid map ID in BeatLeader response");
        }
        this.artist = data.leaderboard.song.author;
        this.id = {
            set: songId,
            map: difficultyId,
            hash: `bl_${rawSongId}_${difficultyId}`,
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
    getCountNames(l: ILocalizer): IDisplayHitCount[] {
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

    getMissLikeValue(l: ILocalizer): IDisplayHitCount {
        return {
            name: l.tr("score-misses"),
            value: this.hitData.missedNotes,
        };
    }
}

class BeatSaberScore implements IGameScore {
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
        if (!data?.leaderboard?.song || !data.leaderboard.difficulty) {
            throw new Error("Invalid score response from BeatLeader API");
        }
        const difficultyId = Number(data.leaderboard.difficulty.id);
        if (!Number.isSafeInteger(difficultyId) || difficultyId <= 0) {
            throw new Error("Invalid difficulty ID in BeatLeader response");
        }
        this.beatmapId = difficultyId;
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

export class BeatLeaderApiClient implements IGameApi {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://api.beatleader.com",
            timeout: 15000,
        });
    }

    async getUserById(id: string): Promise<IGameUser> {
        try {
            const { data } = await this.api.get(`/player/${id}?stats=true&keepOriginalId=false`);
            return new BeatSaberUser(data);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                throw new UserNotFoundError();
            }
            throw error;
        }
    }

    async getUserRecentById(id: string, mode?: number, limit: number = 1): Promise<IGameScore> {
        const data: BLScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sortBy: "date", order: "desc", page: 1, count: limit })}`
            )
        ).data;
        if (Array.isArray(data?.data) && data.data[0]) {
            return new BeatSaberScore(data.data[0]);
        }

        throw new NoRecentScoresError();
    }

    async getUserTopById(id: string, mode?: number, limit: number = 3): Promise<IGameScore[]> {
        const data: BLScoreResponse = (
            await this.api.get(
                `/player/${id}/scores?${qs.stringify({ sortBy: "pp", order: "desc", page: 1, count: limit })}`
            )
        ).data;
        if (Array.isArray(data?.data) && data.data.length > 0) {
            return data.data.map((scoreData: BLScoreData) => new BeatSaberScore(scoreData));
        }

        throw new NoTopScoresError();
    }
}
