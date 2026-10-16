import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";
import * as axios from "axios";

const DEFAULT_WEBSITE_URL = "https://morasooma.net";

const normalizeWebsiteUrl = (value?: string): string => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return DEFAULT_WEBSITE_URL;
    }
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return withScheme.replace(/\/+$/, "");
};

/**
 * Describes a sign-in failure without ever touching the request body, which
 * carries the account password: only the status and the server's own error
 * description are kept.
 */
const describeSignInFailure = (error: unknown): string => {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error.message : "unknown error";
    }
    const status = error.response?.status;
    const data = error.response?.data as { error?: string; error_description?: string } | undefined;
    const description = data?.error_description ?? data?.error;
    if (status && description) {
        return `HTTP ${status}: ${description}`;
    }
    return status ? `HTTP ${status}` : error.code || "request failed";
};

/**
 * Morasooma runs a g0v0-server, whose HTTP surface is osu! API v2 compatible
 * (`/api/v2` routes, lazer score payloads), so the bancho v2 client is reused
 * with its endpoints re-pointed at the Morasooma host.
 *
 * Authentication falls back through three modes:
 *  - account sign-in via `/web-auth/login`, which needs only a username and
 *    password and yields a `*` scope token (Morasooma hands out no OAuth client
 *    credentials, and their private game client id is not public);
 *  - OAuth `client_credentials`, should client credentials ever be issued;
 *  - anonymous, where profile lookups work and score endpoints answer 401.
 */
export class MorasoomaApiClient extends BanchoV2ApiClient {
    readonly websiteUrl: string;
    private readonly username?: string;
    private readonly password?: string;

    constructor(websiteUrl?: string, appId?: number, clientSecret?: string, username?: string, password?: string) {
        const website = normalizeWebsiteUrl(websiteUrl);
        super(appId, clientSecret, {
            apiBaseUrl: `${website}/api/v2`,
            oauthTokenUrl: `${website}/oauth/token`,
            allowAnonymous: true,
            serverLabel: "Morasooma",
        });
        this.websiteUrl = website;
        this.username = username?.trim() || undefined;
        this.password = password || undefined;
    }

    private get hasAccountCredentials(): boolean {
        return !!this.username && !!this.password;
    }

    async login(): Promise<void> {
        if (!this.hasAccountCredentials) {
            await super.login();
            return;
        }

        try {
            const { data } = await axios.default.post(
                `${this.websiteUrl}/web-auth/login`,
                { username: this.username, password: this.password },
                { timeout: 15000, headers: { Accept: "application/json" } }
            );
            if (typeof data?.access_token !== "string" || !data.access_token) {
                throw new Error("sign-in response does not contain an access token");
            }
            this.token = data.access_token;
            this.anonymous = false;
            this.logged = 1;
            global.logger.info(`Signed in to Morasooma as ${this.username}`);
        } catch (error) {
            this.logged = -1;
            throw new Error(`Morasooma sign-in failed — ${describeSignInFailure(error)}`);
        }
    }
}
