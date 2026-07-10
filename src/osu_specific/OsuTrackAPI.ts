import * as axios from "axios";
import { OsuTrackResponse, TrackTopScore } from "../Types";
import qs from "querystring";
import { UserError } from "../UserError";

export default class OsuTrackAPI {
    api: axios.AxiosInstance;
    constructor() {
        this.api = axios.default.create({
            baseURL: "https://ameobea.me/osutrack/api",
            timeout: 20000,
        });
    }

    async getChanges(userId: number, mode: number): Promise<OsuTrackResponse> {
        try {
            const { data: raw } = await this.api.get(`/get_changes.php?${qs.stringify({ id: userId, mode })}`, {
                responseType: "text",
            });

            const jsonStart = typeof raw === "string" ? raw.indexOf("{") : -1;
            if (jsonStart < 0) {
                throw new Error("Invalid response from osutrack API");
            }
            const jsonStr = raw.slice(jsonStart);
            const res = JSON.parse(jsonStr);
            const numericValues = [res?.mode, res?.playcount, res?.pp_raw, res?.pp_rank, res?.accuracy];
            if (
                typeof res?.username !== "string" ||
                !Array.isArray(res?.newhs) ||
                numericValues.some((value) => !Number.isFinite(Number(value))) ||
                res.newhs.some((score) => !score || !Number.isFinite(Number(score.beatmap_id)))
            ) {
                throw new Error("Invalid response from osutrack API");
            }
            return {
                username: res.username,
                mode: Number(res.mode),
                playcount: Number(res.playcount),
                pp: Number(res.pp_raw),
                rank: Number(res.pp_rank),
                accuracy: Number(res.accuracy),
                levelup: Boolean(res.levelup),
                highscores: res.newhs.map((s) => new TrackTopScore(s, Number(res.mode))),
            };
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status == 404) {
                throw new UserError("user-not-found", "User not found");
            }
            throw err;
        }
    }
}
