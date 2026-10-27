import axios, { AxiosInstance } from "axios";
import { InvalidLinkCodeError } from "core/errors/InvalidLinkCodeError";
import { ILinkVerificationResult } from "infrastructure/link/ILinkVerificationResult";

export class LinkServiceClient {
    readonly api?: AxiosInstance;
    private readonly pageUrl?: string;

    constructor(apiUrl?: string, pageUrl?: string) {
        const baseURL = apiUrl
            ?.trim()
            .replace(/\/+$/, "")
            .replace(/\/api\/verify$/, "");
        if (baseURL) {
            this.api = axios.create({ baseURL, timeout: 15000 });
        }
        this.pageUrl = pageUrl?.trim() || undefined;
    }

    async getSupportedServers(): Promise<string[]> {
        if (!this.api) {
            return [];
        }
        let data: { servers?: unknown };
        try {
            ({ data } = await this.api.get("/api/servers"));
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return ["bancho"];
            }
            throw error;
        }
        if (!Array.isArray(data?.servers) || data.servers.some((server) => typeof server !== "string")) {
            throw new Error("Invalid supported servers response from link service");
        }
        return [...new Set(data.servers)];
    }

    getPageUrl(server: string): string {
        const url = new URL(this.pageUrl ?? `${this.api?.defaults.baseURL}/link`);
        url.searchParams.set("server", server);
        return url.href;
    }

    async verifyCode(server: string, code: string): Promise<ILinkVerificationResult> {
        if (!this.api) {
            throw new Error("Link service is not configured");
        }
        let data: { server?: string; user_id?: number | string; is_restrict?: boolean };
        try {
            ({ data } = await this.api.get("/api/verify", { params: { code, server } }));
        } catch (error) {
            if (axios.isAxiosError(error) && [400, 404, 410, 422].includes(error.response?.status)) {
                throw new InvalidLinkCodeError();
            }
            throw error;
        }
        const userId = data?.user_id;
        const validUserId =
            typeof userId === "number"
                ? Number.isSafeInteger(userId) && userId > 0
                : typeof userId === "string" && /^[1-9]\d*$/.test(userId);
        const matchingServer = data?.server === server || (server === "bancho" && data?.server === undefined);
        if (
            !validUserId ||
            !matchingServer ||
            (data.is_restrict !== undefined && typeof data.is_restrict !== "boolean")
        ) {
            throw new InvalidLinkCodeError();
        }
        return { userId, isRestricted: data.is_restrict ?? false };
    }
}
