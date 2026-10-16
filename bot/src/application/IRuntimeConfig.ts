export interface IRuntimeConfig {
    banchoAppId: number;
    banchoClientSecret: string;

    /** Morasooma (g0v0-server) website root; the v2 API lives under `/api/v2`. */
    morasoomaApiBase?: string;

    /** Morasooma OAuth client id; omit to use the anonymous, profile-only mode. */
    morasoomaAppId?: number;

    /** Morasooma OAuth client secret; omit to use the anonymous, profile-only mode. */
    morasoomaClientSecret?: string;

    /** Morasooma account name; signing in this way is what unlocks score endpoints. */
    morasoomaUsername?: string;

    /** Password for {@link morasoomaUsername}. */
    morasoomaPassword?: string;
}
