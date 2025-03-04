import * as axios from "axios";
import { OsuTrackResponse, TrackTopScore } from "./Types";
import qs from "querystring";

export default class OsuTrackAPI {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://ameobea.me/osutrack/api",
            timeout: 20000,
        });
    }

    async getChanges(nickname: string, mode: number): Promise<OsuTrackResponse> {
        try {
            const { data: res } = await this.api.get(`/get_changes.php?${qs.stringify({ user: nickname, mode })}`);
            return {
                username: res.username,
                mode: res.mode,
                playcount: res.playcount,
                pp: res.pp_raw,
                rank: res.pp_rank,
                accuracy: res.accuracy,
                levelup: res.levelup,
                highscores: res.newhs.map((s) => new TrackTopScore(s, res.mode)),
            };
        } catch (err) {
            if (axios.isAxiosError(err) && err.response.status == 404) {
                throw new Error("User not found");
            }
            throw err;
        }
    }
}
