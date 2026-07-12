import { randomBytes } from "node:crypto";
import { ILeaderboardResult } from "games/leaderboards/ILeaderboardResult";
import { Mods } from "games/osu/performance/Mods";
import { LeaderboardSnapshot } from "infrastructure/cache/LeaderboardSnapshot";

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MS = 60 * 1000;
const DEFAULT_MAX_ENTRIES = 10_000;

export class LeaderboardCache {
    private readonly snapshots = new Map<string, LeaderboardSnapshot>();
    private readonly lastRequestByChat = new Map<string, number>();

    constructor(
        private readonly ttlMs: number = DEFAULT_TTL_MS,
        private readonly rateLimitMs: number = DEFAULT_RATE_LIMIT_MS,
        private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
        private readonly now: () => number = Date.now,
        private readonly createId: () => string = () => randomBytes(8).toString("hex")
    ) {}

    create(
        chatId: number,
        serverName: string,
        beatmapId: number,
        mode: number,
        mods: Mods | undefined,
        useCards: boolean,
        result: ILeaderboardResult
    ): LeaderboardSnapshot {
        this.pruneExpired();

        let id = this.createId();
        while (this.snapshots.has(id)) {
            id = this.createId();
        }

        const snapshot = new LeaderboardSnapshot(
            id,
            chatId,
            serverName,
            beatmapId,
            mode,
            mods ? new Mods(mods.toExtendedMods()) : undefined,
            useCards,
            this.now() + this.ttlMs,
            result
        );
        this.snapshots.set(id, snapshot);
        this.trimToLimit();
        return snapshot;
    }

    get(id: string, chatId: number, serverName: string): LeaderboardSnapshot | undefined {
        const snapshot = this.snapshots.get(id);
        if (!snapshot) {
            return undefined;
        }
        if (snapshot.expiresAt <= this.now()) {
            this.snapshots.delete(id);
            return undefined;
        }
        if (snapshot.chatId !== chatId || snapshot.serverName !== serverName) {
            return undefined;
        }
        return snapshot;
    }

    acquireRateLimit(chatId: number, bypass: boolean): number {
        if (bypass) {
            return 0;
        }

        const now = this.now();
        const key = String(chatId);
        const lastRequest = this.lastRequestByChat.get(key);
        if (lastRequest !== undefined) {
            const retryAfter = this.rateLimitMs - (now - lastRequest);
            if (retryAfter > 0) {
                return retryAfter;
            }
        }

        this.lastRequestByChat.set(key, now);
        this.pruneRateLimits(now);
        return 0;
    }

    private pruneExpired(): void {
        const now = this.now();
        for (const [id, snapshot] of this.snapshots) {
            if (snapshot.expiresAt <= now) {
                this.snapshots.delete(id);
            }
        }
    }

    private pruneRateLimits(now: number): void {
        for (const [key, lastRequest] of this.lastRequestByChat) {
            if (now - lastRequest >= this.rateLimitMs) {
                this.lastRequestByChat.delete(key);
            }
        }
    }

    private trimToLimit(): void {
        while (this.snapshots.size > this.maxEntries) {
            const oldestId = this.snapshots.keys().next().value;
            if (oldestId === undefined) {
                break;
            }
            this.snapshots.delete(oldestId);
        }
    }
}
