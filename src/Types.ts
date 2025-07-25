import Mods from "./osu_specific/pp/Mods";
import Util from "./Util";
import { IBeatmap } from "./beatmaps/BeatmapTypes";
import { ILocalisator } from "./ILocalisator";

interface IDatabaseServer {
    getUser(id: number): Promise<IDatabaseUser | null>;
    findByUserId(id: number | string): Promise<IDatabaseUser[]>;
    setNickname(id: number, uid: number | string, nickname: string, mode?: number): Promise<void>;
    setMode(id: number, mode: number): Promise<boolean>;
    updateInfo(user: APIUser, mode: number): Promise<void>;
    getUserStats(id: number, mode: number): Promise<IDatabaseUserStats>;
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
    fake: boolean;
    constructor(args: PPArgs, mode: number) {
        this.fake = true;
        this.mods = args.mods;
        this.mode = mode;
        this.acc = args.acc;
        this.combo = args.combo;
        switch (mode) {
            case 0:
            case 1:
            case 2: {
                this.acc = args.acc;
                this.combo = args.combo;
                this.counts = new HitCounts(
                    {
                        300: args.hits - args.miss,
                        100: 0,
                        50: args.counts?.[50] ?? 0,
                        katu: 0,
                        geki: 0,
                        miss: args.miss,
                    },
                    mode
                );
                this.mods = args.mods;
                break;
            }

            case 3: {
                this.counts = new HitCounts(
                    {
                        300: args.hits,
                        100: 0,
                        50: 0,
                        miss: 0,
                        katu: 0,
                        geki: 0,
                    },
                    this.mode
                );
                this.mods = args.mods;
                this.acc = args.acc;
                this.combo = args.combo;
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
    Loved = 4,
}

enum ProfileMode {
    STD = 0,
    Taiko = 1,
    Catch = 2,
    Mania = 3,
}

enum Mode {
    "osu!" = 0,
    "osu!taiko" = 1,
    "osu!catch" = 2,
    "osu!mania" = 3,
}

interface IHits {
    300: number;
    100: number;
    50: number;
    miss: number;
    katu?: number;
    geki?: number;
    slider_large?: number;
    slider_tail?: number;
}

interface ICustomHit {
    name: string;
    value: number;
}

interface IHitCounts {
    hitData?: unknown;
    totalHits(): number;
    toString(): string;
    getCountNames(l: ILocalisator): ICustomHit[];
    getMissLikeValue(l: ILocalisator): ICustomHit;
}

class HitCounts implements IHitCounts {
    hitData: IHits;
    mode: number;
    constructor(hits: IHits, mode: number) {
        this.hitData = hits;
        this.mode = mode;
    }

    totalHits(): number {
        switch (this.mode) {
            case 1:
                return this.hitData[300] + this.hitData[100] + this.hitData[50] + this.hitData.miss;
            case 2:
                return 0;
            case 3:
                return (
                    this.hitData.geki +
                    this.hitData.katu +
                    this.hitData[300] +
                    this.hitData[100] +
                    this.hitData[50] +
                    this.hitData.miss
                );
            default:
                return this.hitData[300] + this.hitData[100] + this.hitData[50] + this.hitData.miss;
        }
    }

    toString(): string {
        switch (this.mode) {
            case 0:
            case 1:
            case 2:
                return `${this.hitData[300]}/${this.hitData[100]}/${this.hitData[50]}/${this.hitData.miss}`;

            case 3:
                return `${this.hitData.geki}/${this.hitData[300]}/${this.hitData.katu}/${this.hitData[100]}/${this.hitData[50]}/${this.hitData.miss}`;

            default:
                return "";
        }
    }

    getCountNames(l: ILocalisator): ICustomHit[] {
        return [
            ...(this.mode === 3
                ? [
                      {
                          name: "320",
                          value: this.hitData.geki,
                      },
                  ]
                : []),
            {
                name: "300",
                value: this.hitData[300],
            },
            ...(this.mode === 3
                ? [
                      {
                          name: "200",
                          value: this.hitData.katu,
                      },
                  ]
                : []),
            {
                name: "100",
                value: this.hitData[100],
            },
            {
                name: "50",
                value: this.hitData[50],
            },
            this.getMissLikeValue(l),
        ];
    }

    getMissLikeValue(l: ILocalisator): ICustomHit {
        return {
            name: l.tr("score-misses"),
            value: this.hitData.miss,
        };
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
}

interface IBeatmapObjects {
    circles: number;
    sliders: number;
    spinners: number;
}

interface APIUserGradeCounts {
    a: number;
    s: number;
    ss: number;
    sh: number;
    ssh: number;
}

interface APIUser {
    id: number | string;
    nickname: string;
    playcount: number;
    playtime?: number;
    pp: number;
    rank: {
        total: number;
        country: number;
    };
    country: string;
    accuracy: number;
    level?: number;
    levelProgress?: number;
    total_score?: number;
    mode: number;

    grades?: APIUserGradeCounts;
    is_supporter?: boolean;

    profileBackgroundUrl?: string;
    profileAvatarUrl?: string;
}

interface APIScore {
    api_score_id?: number;
    beatmapId: number;
    score: number;
    combo: number;
    counts: IHitCounts;
    mods: Mods;
    mode: number;
    rank?: string;
    rank_global?: number;
    top100_number?: number;
    date?: Date;
    pp?: number;
    fcPp?: number;
    beatmap?: IBeatmap;
    player_id?: number;
    fake?: boolean;
    has_replay?: boolean;
    accuracy(): number;
}

interface APIBeatmap {
    artist: string;
    id: {
        set: number;
        map: number;
        hash: string;
    };
    bpm: number;
    creator: {
        nickname: string;
        id: number;
    };
    status: string;
    stats: IBeatmapStats;
    diff: IBeatmapStars;
    objects: IBeatmapObjects;
    title: string;
    length: number;
    version: string;
    combo: number;
    mode: number;
    coverUrl?: string;
    mapUrl?: string;
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
    constructor(data, mode: number) {
        this.beatmapId = Number(data.beatmap_id);
        this.score = Number(data.score);
        this.combo = Number(data.maxcombo);
        this.counts = new HitCounts(
            {
                300: Number(data.count300),
                100: Number(data.count100),
                50: Number(data.count50),
                miss: Number(data.countmiss),
                katu: Number(data.countkatu),
                geki: Number(data.countgeki),
            },
            mode
        );
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

interface IDatabaseUser {
    id: number;
    game_id: string;
    nickname: string;
    mode: number;
    pp: number;
    rank: number;
    acc: number;
}

interface IDatabaseUserStats {
    id: number;
    nickname: string;
    pp: number;
    rank: number;
    acc: number;
}

interface LeaderboardScore {
    user: IDatabaseUser;
    score: APIScore;
}

interface LeaderboardResponse {
    map: IBeatmap;
    scores: LeaderboardScore[];
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

interface V2BeatmapsetsArguments {
    query?: string;
    status?: string;
    limit?: number;
}

interface V2Beatmapset {
    id: number;
    title: string;
    artist: string;
    rankedDate: Date;
    creator: string;
    status: string;
    beatmaps: V2Beatmap[];
}

interface V2Beatmap {
    id: number;
    mode: number;
    stars: number;
    version: string;
}

interface V2Mod {
    acronym: string;
    settings?: {
        speed_change?: number;
    };
}

export {
    APIUser,
    APIScore,
    APIBeatmap,
    APIUserGradeCounts,
    TrackTopScore,
    BeatmapStatus,
    ProfileMode,
    Mode,
    HitCounts,
    IHits,
    ICustomHit,
    IHitCounts,
    IBeatmapStats,
    IBeatmapStars,
    IBeatmapObjects,
    IDatabaseServer,
    PPArgs,
    CalcArgs,
    IDatabaseUser,
    IDatabaseUserStats,
    LeaderboardScore,
    LeaderboardResponse,
    OsuTrackResponse,
    V2BeatmapsetsArguments,
    V2Mod,
    V2Beatmapset,
};
