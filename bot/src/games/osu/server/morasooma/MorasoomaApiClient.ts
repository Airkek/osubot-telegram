import axios from "axios";
import { NoScoresFoundError } from "core/errors/NoScoresFoundError";
import { Mods } from "games/osu/performance/Mods";
import { IOsuV2Score } from "games/osu/server/v2/IOsuV2Score";
import { OsuV2ApiClient } from "games/osu/server/v2/OsuV2ApiClient";
import { IGameUser } from "games/users/IGameUser";

const SERVER_URL = "https://morasooma.net";

export class MorasoomaApiClient extends OsuV2ApiClient {
    private tokenExpiresAt = 0;
    private loginPromise?: Promise<void>;

    constructor(
        private readonly clientId?: number,
        private readonly clientSecret?: string
    ) {
        super(`${SERVER_URL}/api/v2`);
    }

    async login(): Promise<void> {
        this.loginPromise ??= this.requestToken();
        try {
            await this.loginPromise;
        } finally {
            this.loginPromise = undefined;
        }
    }

    private async requestToken(): Promise<void> {
        try {
            if (!Number.isSafeInteger(this.clientId) || this.clientId <= 0 || !this.clientSecret?.trim()) {
                throw new Error("Morasooma OAuth client credentials are not configured");
            }
            const { data } = await axios.post(
                `${SERVER_URL}/oauth/token`,
                {
                    grant_type: "client_credentials",
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    scope: "public",
                },
                { timeout: 15000 }
            );
            const expiresIn = Number(data?.expires_in);
            if (
                typeof data?.access_token !== "string" ||
                !data.access_token ||
                !Number.isFinite(expiresIn) ||
                expiresIn <= 0
            ) {
                throw new Error("Morasooma OAuth token response is invalid");
            }
            this.token = data.access_token;
            this.tokenExpiresAt = Date.now() + expiresIn * 1000;
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
        user.profileUrl = `${SERVER_URL}/users/${user.id}`;
        if (user.profileAvatarUrl) {
            user.profileAvatarUrl = new URL(user.profileAvatarUrl, SERVER_URL).href;
        }
        if (user.profileBackgroundUrl) {
            user.profileBackgroundUrl = new URL(user.profileBackgroundUrl, SERVER_URL).href;
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

        const data: { scores: IOsuV2Score[] } = await this.get(`/beatmaps/${beatmapId}/scores/users/${uid}/all`, {
            ruleset: ["osu", "taiko", "fruits", "mania"][mode ?? 0],
        });
        if (!data) {
            throw new NoScoresFoundError();
        }
        if (!Array.isArray(data.scores)) {
            throw new Error("Invalid user scores response from Morasooma API");
        }

        const modKey = (value: Mods) =>
            value
                .toAcronymList(true)
                .filter((mod) => mod !== "CL")
                .sort()
                .join(",");
        const requestedMods = modKey(mods);
        const score = data.scores
            .filter((candidate) => modKey(new Mods(candidate.mods)) === requestedMods)
            .sort((left, right) => right.total_score - left.total_score)[0];
        if (!score) {
            throw new NoScoresFoundError();
        }
        return score;
    }
}
