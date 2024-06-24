import { IAPI } from "../API";
import * as axios from "axios";
import { APIUser } from "../Types";
import { Bot } from "../Bot"

interface BLUserResponse {
    mapperId: number,
    banned: boolean,
    inactive: boolean,
    banDescription: any,
    externalProfileUrl: string,
    richBioTimeset: number,
    speedrunStart: number,
    history: any,
    badges: any[],
    pinnedScores: any,
    changes: any[],
    accPp: number,
    passPp: number,
    techPp: number,
    scoreStats: {
      id: number,
      totalScore: number,
      totalUnrankedScore: number,
      totalRankedScore: number,
      lastScoreTime: number,
      lastUnrankedScoreTime: number,
      lastRankedScoreTime: number,
      averageRankedAccuracy: number,
      averageWeightedRankedAccuracy: number,
      averageUnrankedAccuracy: number,
      averageAccuracy: number,
      medianRankedAccuracy: number,
      medianAccuracy: number,
      topRankedAccuracy: number,
      topUnrankedAccuracy: number,
      topAccuracy: number,
      topPp: number,
      topBonusPP: number,
      topPassPP: number,
      topAccPP: number,
      topTechPP: number,
      peakRank: number,
      rankedMaxStreak: number,
      unrankedMaxStreak: number,
      maxStreak: number,
      averageLeftTiming: number,
      averageRightTiming: number,
      rankedPlayCount: number,
      unrankedPlayCount: number,
      totalPlayCount: number,
      rankedImprovementsCount: number,
      unrankedImprovementsCount: number,
      totalImprovementsCount: number,
      rankedTop1Count: number,
      unrankedTop1Count: number,
      top1Count: number,
      rankedTop1Score: number,
      unrankedTop1Score: number,
      top1Score: number,
      averageRankedRank: number,
      averageWeightedRankedRank: number,
      averageUnrankedRank: number,
      averageRank: number,
      sspPlays: number,
      ssPlays: number,
      spPlays: number,
      sPlays: number,
      aPlays: number,
      topPlatform: string,
      topHMD: number,
      topPercentile: number,
      countryTopPercentile: number,
      dailyImprovements: number,
      authorizedReplayWatched: number,
      anonimusReplayWatched: number,
      watchedReplays: number,
    },
    lastWeekPp: number,
    lastWeekRank: number,
    lastWeekCountryRank: number,
    id: string,
    name: string,
    platform: string,
    avatar: string,
    country: string,
    alias: any,
    bot: boolean,
    pp: number,
    rank: number,
    countryRank: number,
    role: string,
    socials: any[],
    contextExtensions: any,
    patreonFeatures: any,
    profileSettings: {
      id: number,
      bio: any,
      message: any,
      effectName: string,
      profileAppearance: string,
      hue: any,
      saturation: any,
      leftSaberColor: any,
      rightSaberColor: any,
      profileCover: any,
      starredFriends: string,
      horizontalRichBio: boolean,
      rankedMapperSort: any,
      showBots: boolean,
      showAllRatings: boolean,
      showStatsPublic: boolean,
      showStatsPublicPinned: boolean,
    },
    clanOrder: string,
    clans: any[],
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
    constructor(data: BLUserResponse) {
        this.id = data.id;
        this.nickname = data.name;
        this.playcount = data.scoreStats.totalPlayCount;
        this.pp = data.pp;
        this.rank = {
            total: data.rank,
            country: data.countryRank
        };
        this.country = data.country;
        this.accuracy = data.scoreStats.averageAccuracy * 100;
    }
}


export default class BeatLeaderAPI implements IAPI {
    bot: Bot;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.api = axios.default.create({
            baseURL: "https://api.beatleader.xyz",
            timeout: 3000
        });
    }

    async getUserById(id: string, mode?: number): Promise<APIUser> {
        try {
            let { data } = await this.api.get(`/player/${id}?stats=true&keepOriginalId=false`);
            return new BeatSaberUser(data);
        } catch(e) {
            throw e || "User not found";
        }
    }
}