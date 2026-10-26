import axios from "axios";
import { NoScoresFoundError } from "core/errors/NoScoresFoundError";
import { Mods } from "games/osu/performance/Mods";
import { IOsuV2Score } from "games/osu/server/v2/IOsuV2Score";
import { OsuV2ApiClient } from "games/osu/server/v2/OsuV2ApiClient";
import { IGameUser } from "games/users/IGameUser";

export class G0v0ApiClient extends OsuV2ApiClient {
    private tokenExpiresAt = 0;
    private loginPromise?: Promise<void>;

    constructor(private readonly serverUrl: string) {
        super(`${serverUrl}/api/v2`);
    }

    async login(): Promise<void> {
        this.loginPromise ??= this.requestPublicToken();
        try {
            await this.loginPromise;
        } finally {
            this.loginPromise = undefined;
        }
    }

    private async requestPublicToken(): Promise<void> {
        try {
            const { data } = await axios.post(`${this.serverUrl}/web-auth/public-token`, undefined, { timeout: 15000 });
            if (typeof data?.access_token !== "string" || !data.access_token || !(data.expires_in > 0)) {
                throw new Error("g0v0 public token response is invalid");
            }
            this.token = data.access_token;
            this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
            this.logged = 1;
        } catch (error) {
            this.token = undefined;
            this.tokenExpiresAt = 0;
            this.logged = -1;
            throw error;
        }
    }

    protected async ensureAuthenticated(): Promise<void> {
        if (!this.token || Date.now() >= this.tokenExpiresAt - 30000) {
            await this.login();
        }
    }

    async getUser(nickname: string, mode?: number): Promise<IGameUser> {
        return this.withProfileUrls(await super.getUser(nickname, mode));
    }

    async getUserById(id: number | string, mode?: number): Promise<IGameUser> {
        return this.withProfileUrls(await super.getUserById(id, mode));
    }

    private withProfileUrls(user: IGameUser): IGameUser {
        user.profileUrl = `${this.serverUrl}/users/${user.id}`;
        if (user.profileAvatarUrl) {
            user.profileAvatarUrl = new URL(user.profileAvatarUrl, this.serverUrl).href;
        }
        if (user.profileBackgroundUrl) {
            user.profileBackgroundUrl = new URL(user.profileBackgroundUrl, this.serverUrl).href;
        }
        return user;
    }

    protected async getBeatmapUserScore(
        uid: number | string,
        beatmapId: number,
        mode?: number,
        mods?: Mods
    ): Promise<IOsuV2Score> {
        if (mods === undefined) {
            return await super.getBeatmapUserScore(uid, beatmapId, mode);
        }

        const scores: IOsuV2Score[] = await this.get(`/beatmaps/${beatmapId}/scores/users/${uid}/all`, {
            ruleset: ["osu", "taiko", "fruits", "mania"][mode ?? 0],
        });
        if (!scores) {
            throw new NoScoresFoundError();
        }
        if (!Array.isArray(scores)) {
            throw new Error("Invalid user scores response from g0v0 API");
        }

        const modKey = (value: Mods) =>
            value
                .toAcronymList(true)
                .filter((mod) => mod !== "CL")
                .sort()
                .join(",");
        const requestedMods = modKey(mods);
        const score = scores
            .filter((candidate) => modKey(new Mods(candidate.mods)) === requestedMods)
            .sort((left, right) => right.total_score - left.total_score)[0];
        if (!score) {
            throw new NoScoresFoundError();
        }
        return score;
    }
}
