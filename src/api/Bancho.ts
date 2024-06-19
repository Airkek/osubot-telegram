import IAPI from './base';
import * as fs from 'fs'
import * as axios from 'axios';
import qs from 'querystring';
import { APIUser, APIBeatmap, APIRecentScore, HitCounts, APIScore, IDatabaseUser, LeaderboardScore, LeaderboardResponse, IDatabaseUserStats } from '../Types';
import Mods from '../pp/Mods';
import Util from '../Util';
import { Bot } from "../Bot"

export default class BanchoAPI {
    bot: Bot;
    token: string;
    api: axios.AxiosInstance;
    constructor(bot: Bot) {
        this.bot = bot;
        this.token = bot.config.tokens.bancho_v1;
        this.api = axios.default.create({
            baseURL: "https://osu.ppy.sh/api",
            timeout: 3000
        });
    }
    /**
     * @deprecated The method should not be used
     */
    async getBeatmap(id: number | string, mode: number = 0, mods: number = 0): Promise<APIBeatmap> {
        // Preserving only for replays
        let opts: any = {
            k: this.token,
            a: 1,
            mode: mode
        };
        if(typeof id == "number")
            throw "Bancho api V1 deprecated";
        else
            opts.h = String(id);
        if(mods)
            opts.mods = mods;
        let { data } = await this.api.get(`/get_beatmaps?${qs.stringify(opts)}`);
        if(!data[0])
            throw "Beatmap not found";

        let beatmap = new APIBeatmap(data[0]);
        if(mods)
            beatmap.stats.modify(new Mods(mods));

        const folderPath = 'beatmap_cache';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        const filePath = `beatmap_cache/${beatmap.id.map}.osu`;
        if (!fs.existsSync(filePath)) {
            const response = await axios.default.get(`https://osu.ppy.sh/osu/${beatmap.id.map}`, { responseType: 'arraybuffer' })
            const buffer = Buffer.from(response.data, 'binary');
            fs.writeFileSync(filePath, buffer);
        }
        return beatmap;
    }
}