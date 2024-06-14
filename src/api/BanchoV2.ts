import * as axios from "axios";
import qs from "querystring";
import { EventEmitter } from "eventemitter3";
import { APIV2Events } from "../Events";
import BanchoV2Data from "./BanchoV2Data";
import { Client, UserScore } from 'osu-web.js';
import { V2ChangelogArguments, V2BeatmapsetsArguments, V2ChangelogResponse, V2Beatmapset, V2News, APIRecentScore, HitCounts } from "../Types";
import Mods from "../pp/Mods";
import Util from "../Util";

interface IAPIData {
    lastBuild: number;
    lastRanked: number;
}

class V2RecentScore implements APIRecentScore {
    beatmapId: number;
    score: number;
    combo: number;
    counts: HitCounts;
    mods: Mods;
    rank: string;
    mode: number;
    constructor(data: UserScore) {
        this.beatmapId = data.beatmap.id;
        this.score = data.score;
        this.combo = data.max_combo;
        this.counts = new HitCounts({
            300: data.statistics.count_300,
            100: data.statistics.count_100,
            50: data.statistics.count_50,
            miss: data.statistics.count_miss,
            katu: data.statistics.count_katu,
            geki: data.statistics.count_geki
        }, data.mode_int);
        this.mods = new Mods(data.mods);
        this.rank = data.rank;
        this.mode = data.mode_int;
    }

    accuracy() {
        return Util.accuracy(this.counts);
    }
}

class BanchoAPIV2 {
    api: axios.AxiosInstance;
    data: BanchoV2Data;
    logged: number;
    token?: string;
    refresh_token?: string;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://osu.ppy.sh/api/v2",
            timeout: 1e4
        });
        this.logged = 0;

        this.data = new BanchoV2Data(this);
    }

    async login(username: string, password: string) {
        let { data } = await axios.default.post(`https://osu.ppy.sh/oauth/token`, {
            username,
            password,
            grant_type: "password",
            client_id: 5,
            client_secret: "FGc9GAtyHzeQDshWP5Ah7dega8hJACAJpQtw6OXk",
            scope: "*"
        });
        if(!data.access_token)
            return this.logged = -1;
        this.token = data.access_token;
        this.refresh_token = data.refresh_token;
        return this.logged = 1;
    }

    async request(method: string, query?: {[key: string]: any}) {
        try {
            let { data } = await this.api.get(`${method}${query ? `?${qs.stringify(query)}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            return data;
        } catch(e) {
            if(e.response?.status == 401) {
                await this.refresh();
                return this.request(method, query);
            }
            throw e;
        }
    }

    async refresh() {
        if(this.logged != 1)
            throw "Not logged in";
        let { data } = await axios.default.post(`https://osu.ppy.sh/oauth/token`, {
            client_id: 5,
            client_secret: "FGc9GAtyHzeQDshWP5Ah7dega8hJACAJpQtw6OXk",
            grant_type: "refresh_token",
            refresh_token: this.refresh_token,
            scope: "*"
        });
        this.token = data.access_token;
        this.refresh_token = data.refresh_token;
        return true;
    }

    startUpdates() {
        setInterval(async() => {
            await this.data.fetch();
        }, 15e3);
    }

    async getChangelog(args: V2ChangelogArguments): Promise<V2ChangelogResponse[]> {
        let data = (await this.request('/changelog', { stream: args.stream || "stable40", limit: args.limit })).builds;
        return data.map(build => ({
            id: build.id,
            version: build.version,
            entries: build.changelog_entries.map(entry => ({
                category: entry.category,
                title: entry.title,
                isMajor: entry.major
            }))
        }));
    }

    async getBeatmapsets(args: V2BeatmapsetsArguments): Promise<V2Beatmapset[]> {
        let data = await this.request('/beatmapsets/search/', { q: args.query || null, s: args.status || 'ranked' });
        return data.beatmapsets.map(set => ({
            id: set.id,
            title: set.title,
            artist: set.artist,
            rankedDate: new Date(set.ranked_date),
            creator: set.creator,
            status: set.status,
            beatmaps: set.beatmaps.map(map => ({
                id: map.id,
                mode: map.mode_int,
                stars: map.difficulty_rating,
                version: map.version
            }))
        }));
    }

    async getRecentScores(uid: number, mode: number): Promise<APIRecentScore> {
        let ruleset = "osu";
        switch (mode) {
            case 0: ruleset = "osu"; break;
            case 1: ruleset = "taiko"; break;
            case 2: ruleset = "fruits"; break;
            case 3: ruleset = "mania"; break;
        }
        let data = await this.request(`/users/${uid}/scores/recent`, { 
            mode: ruleset, 
            include_fails: true,
            limit: 1
        });

        if (data[0]) {
            let score = data[0];
            return new V2RecentScore(score);
        } else {
            throw "No recent scores";
        }
    }

    async getNews(): Promise<V2News> {
        let data = (await this.request('/news')).news_posts[0];
        return {
            id: data.id,
            author: data.author,
            image: data.first_image.startsWith("/") ? "https://osu.ppy.sh" + data.first_image : data.first_image,
            title: data.title,
            link: "https://osu.ppy.sh/home/news/" + data.slug,
            date: new Date(data.published_at)
        };
    }
}

export default BanchoAPIV2;
