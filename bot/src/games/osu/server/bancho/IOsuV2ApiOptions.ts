export interface IOsuV2ApiOptions {
    /** Base URL of the osu! API v2 root, without a trailing slash. */
    apiBaseUrl?: string;

    /** Full URL of the OAuth token endpoint. */
    oauthTokenUrl?: string;

    /**
     * Whether the client may run without OAuth credentials.
     * Anonymous clients only reach endpoints the server exposes publicly.
     */
    allowAnonymous?: boolean;

    /** Human readable server name, used in log and error messages. */
    serverLabel?: string;
}
