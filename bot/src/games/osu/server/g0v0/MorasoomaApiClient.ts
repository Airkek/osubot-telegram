import { BanchoV2ApiClient } from "games/osu/server/bancho/BanchoV2ApiClient";

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
 * Morasooma runs a g0v0-server, whose HTTP surface is osu! API v2 compatible
 * (OAuth `client_credentials` for a `public` scope token, `/api/v2` routes,
 * lazer score payloads), so the bancho v2 client is reused with its endpoints
 * re-pointed at the Morasooma host.
 *
 * Without credentials the client stays anonymous: profile lookups are public on
 * Morasooma, while score endpoints answer 401 and surface a configuration error.
 */
export class MorasoomaApiClient extends BanchoV2ApiClient {
    readonly websiteUrl: string;

    constructor(websiteUrl?: string, appId?: number, clientSecret?: string) {
        const website = normalizeWebsiteUrl(websiteUrl);
        super(appId, clientSecret, {
            apiBaseUrl: `${website}/api/v2`,
            oauthTokenUrl: `${website}/oauth/token`,
            allowAnonymous: true,
            serverLabel: "Morasooma",
        });
        this.websiteUrl = website;
    }
}
