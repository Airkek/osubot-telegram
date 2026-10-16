import { randomUUID } from "node:crypto";

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

interface StoredCard {
    data: Buffer;
    expiresAt: number;
}

/**
 * Holds freshly rendered inline cards so the Bot API server can fetch them over
 * HTTP: inline results take a URL, while the generator produces a buffer.
 *
 * Entries are short lived — Telegram downloads the image right after the result
 * is answered — so they are kept in memory rather than on disk.
 */
export class InlineCardStore {
    private readonly cards = new Map<string, StoredCard>();
    private cleanupTimer?: NodeJS.Timeout;

    constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

    put(data: Buffer): string {
        this.ensureCleanupScheduled();
        const id = randomUUID();
        this.cards.set(id, { data, expiresAt: Date.now() + this.ttlMs });
        return id;
    }

    get(id: string): Buffer | undefined {
        const card = this.cards.get(id);
        if (!card) {
            return undefined;
        }
        if (card.expiresAt <= Date.now()) {
            this.cards.delete(id);
            return undefined;
        }
        return card.data;
    }

    stop(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.cards.clear();
    }

    private ensureCleanupScheduled(): void {
        if (this.cleanupTimer) {
            return;
        }
        this.cleanupTimer = setInterval(() => this.removeExpired(), CLEANUP_INTERVAL_MS);
        this.cleanupTimer.unref?.();
    }

    private removeExpired(): void {
        const now = Date.now();
        for (const [id, card] of this.cards) {
            if (card.expiresAt <= now) {
                this.cards.delete(id);
            }
        }
    }
}
