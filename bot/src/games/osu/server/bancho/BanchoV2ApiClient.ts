import axios from "axios";
import { OsuV2ApiClient } from "games/osu/server/v2/OsuV2ApiClient";

export class BanchoV2ApiClient extends OsuV2ApiClient {
    constructor(
        public app_id: number,
        public client_secret: string
    ) {
        super("https://osu.ppy.sh/api/v2");
    }

    async login(): Promise<void> {
        try {
            const { data } = await axios.post(
                "https://osu.ppy.sh/oauth/token",
                {
                    grant_type: "client_credentials",
                    client_id: this.app_id,
                    client_secret: this.client_secret,
                    scope: "public",
                },
                { timeout: 15000 }
            );
            if (typeof data?.access_token !== "string" || !data.access_token) {
                throw new Error("osu! OAuth response does not contain an access token");
            }
            this.token = data.access_token;
            this.logged = 1;
        } catch (error) {
            this.logged = -1;
            throw error;
        }
    }
}
