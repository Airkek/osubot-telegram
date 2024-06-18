import { IAPI } from './API';
import Mods from './pp/Mods';
import { ICalcStats } from './pp/Stats';
import Util from './Util';

interface ICommandArgs {
    full: string[];
    string: string[];
    nickname: string[];
    mods: string;
    combo: number;
    acc: number;
    miss: number;
    place: number;
    apx: number;
    more: number;
    c50: number;
    mode?: number;
}

interface PPArgs {
    score?: number;
    acc?: number;
    combo?: number;
    miss?: number;
    hits?: number;
    counts?: {
        50: number;
    };
    mods: Mods;
}

class CalcArgs {
    score?: number;
    acc?: number;
    combo?: number;
    counts?: HitCounts;
    mods: Mods;
    mode: number;
    constructor(args: PPArgs, mode: number) {
        this.mods = args.mods;
        this.mode = mode;
        switch(mode) {
            case 0:
            case 1:
            case 2: {
                this.acc = args.acc;
                this.combo = args.combo;
                this.counts = new HitCounts({
                    300: args.hits - args.miss,
                    100: 0,
                    50: args.counts?.[50] ?? 0,
                    miss: args.miss
                }, mode);
                this.mods = args.mods;
                break;
            }

            case 3: {
                this.counts = new HitCounts({
                    300: args.hits,
                    100: 0,
                    50: 0,
                    miss: 0,
                    katu: 0,
                    geki: 0
                }, this.mode)
                this.score = args.score;
                break;
            }
        }
    }

    accuracy() {
        return this.acc;
    }
}

enum BeatmapStatus {
    Graveyard = -2,
    WIP = -1,
    Pending = 0,
    Ranked = 1,
    Approved = 2,
    Qualified = 3,
    Loved = 4
}

enum ProfileMode {
    STD,
    Taiko,
    Catch,
    Mania
}

enum Mode {
    "osu!",
    "osu!taiko",
    "osu!catch",
    "osu!mania"
}

interface IHits {
    300: number,
    100: number,
    50: number,
    miss: number,
    katu?: number,
    geki?: number
}

class HitCounts implements IHits {
    300: number;
    100: number;
    50: number;
    miss: number;
    katu?: number;
    geki?: number;
    mode: number;
    constructor(hits: IHits, mode: number) {
        this[300] = hits[300];
        this[100] = hits[100];
        this[50] = hits[50];
        this.miss = hits.miss;
        this.katu = hits.katu;
        this.geki = hits.geki;
        this.mode = mode;
    }

    accuracy() {
        Util.accuracy(this);
    }

    totalHits(): number {
        switch(this.mode) {
            case 1:
                return this[300] + this[100] + this[50] + this.miss;
            case 2:
                return 0;
            case 3: 
                return this.geki + this.katu + this[300] + this[100] + this[50] + this.miss;
            default:
                return this[300] + this[100] + this[50] + this.miss;
        }
    }

    toString(): string {
        switch(this.mode) {
            case 0:
            case 1:
            case 2:
                return `${this[300]}/${this[100]}/${this[50]}/${this.miss}`;

            case 3:
                return `${this.geki}/${this[300]}/${this.katu}/${this[100]}/${this[50]}/${this.miss}`;

            default:
                return '';
        }
    }
}

interface IBeatmapStats {
    cs: number;
    od: number;
    ar: number;
    hp: number;
}

interface IBeatmapStars {
    stars: number;
    aim: number;
    speed: number;
}

interface IBeatmapObjects {
    circles: number;
    sliders: number;
    spinners: number;
}

interface APIUser {
    api: IAPI;
    id: number;
    nickname: string;
    playcount: number;
    playtime: number;
    pp: number;
    rank: {
        total: number,
        country: number
    };
    country: string;
    accuracy: number;
    level: number;
}

interface APITopScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    date: Date;
    accuracy(): number;
}

interface APIScore {
    api: IAPI;
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    mode: number;
    accuracy(): number;
    rank: string;
    date: Date;
}

class APIBeatmap {
    api: IAPI;
    artist: string;
    id: {
        set: number;
        map: number;
    };
    bpm: number;
    creator: {
        nickname: string;
        id: number;
    };
    status: string;
    stats: ICalcStats;
    diff: IBeatmapStars;
    objects: IBeatmapObjects;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;
    constructor(data: any, api: IAPI) {
        this.api = api;
        this.artist = data.artist;
        this.id = {
            set: Number(data.beatmapset_id),
            map: Number(data.beatmap_id)
        };
        this.bpm = Number(data.bpm);
        this.creator = {
            nickname: data.creator,
            id: Number(data.creator_id)
        };
        this.status = BeatmapStatus[Number(data.approved)];
        this.stats = Util.getStats({
            cs: Number(data.diff_size),
            od: Number(data.diff_overall),
            ar: Number(data.diff_approach),
            hp: Number(data.diff_drain)
        }, Number(data.mode));
        this.diff = {
            stars: Number(data.difficultyrating),
            aim: Number(data.diff_aim),
            speed: Number(data.diff_speed)
        };
        this.objects = {
            circles: Number(data.count_normal),
            sliders: Number(data.count_slider),
            spinners: Number(data.count_spinner)
        };
        this.title = data.title;
        this.length = Number(data.total_length);
        this.version = data.version;
        this.combo = data.mode == 1 ? this.objects.circles : Number(data.max_combo);
        this.mode = Number(data.mode);
    }
}

class TrackTopScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    pp: number;
    mode: number;
    place: number;
    constructor(data: any, mode: number) {
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts({
            300: Number(data.count300),
            100: Number(data.count100),
            50: Number(data.count50),
            miss: Number(data.countmiss),
            katu: Number(data.countkatu),
            geki: Number(data.countgeki)
        }, mode);
        this.mods = new Mods(Number(data.enabled_mods));
        this.rank = data.rank;
        this.pp = Number(data.pp);
        this.mode = mode;
        this.place = data.ranking;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

interface APIRecentScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    accuracy(): number;
}

interface IDatabaseUser {
    id: number,
    uid: number,
    nickname: string,
    mode: number,
    pp: number,
    rank: number,
    acc: number
}

interface IDatabaseUserStats {
    id: number,
    nickname: string,
    pp: number,
    rank: number,
    acc: number
}

interface LeaderboardScore {
    user: IDatabaseUser,
    score: APIScore
}

interface LeaderboardResponse {
    maps: { mods: number, map: APIBeatmap }[],
    scores: LeaderboardScore[]
}

interface OsuTrackResponse {
    username: string;
    mode: number;
    playcount: number;
    pp: number;
    rank: number;
    accuracy: number;
    levelup: boolean;
    highscores: TrackTopScore[];
}

interface V2ChangelogArguments {
    stream?: string;
    limit?: number;
}

interface V2BeatmapsetsArguments {
    query?: string;
    status?: string;
    limit?: number;
}

interface V2ChangelogResponse {
    id: number;
    version: string;
    entries: V2ChangelogEntry[];
}

interface V2ChangelogEntry {
    category: string;
    title: string;
    isMajor: boolean;
}

interface V2Beatmapset {
    id: number;
    title: string;
    artist: string;
    rankedDate: Date;
    creator: string;
    status: string;
    beatmaps: V2Beatmap[]
}

interface V2Beatmap {
    id: number;
    mode: number;
    stars: number;
    version: string;
}

interface V2News {
    id: number;
    author: string;
    image: string;
    title: string;
    link: string;
    date: Date;
}

interface V2Mod {
    acronym: string
    settings?: {
        speed_change?: number
    }
}

export {
    APIUser,
    APITopScore,
    APIScore,
    APIBeatmap,
    APIRecentScore,

    TrackTopScore,

    BeatmapStatus,
    ProfileMode,
    Mode,
    HitCounts,
    IHits,
    IBeatmapStats,
    IBeatmapStars,
    IBeatmapObjects,

    ICommandArgs,
    PPArgs,
    CalcArgs,

    IDatabaseUser,
    IDatabaseUserStats,
    LeaderboardScore,
    LeaderboardResponse,
    OsuTrackResponse,

    V2ChangelogArguments,
    V2BeatmapsetsArguments,
    V2Mod,
    
    V2ChangelogResponse,
    V2Beatmapset,
    V2News
}