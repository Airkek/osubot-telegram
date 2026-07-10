import { IBeatmap } from "./beatmaps/BeatmapTypes";

interface Chat {
    id: number;
    map: IBeatmap;
    expiresAt: number;
}

export default class Maps {
    private readonly chats: Map<number, Chat> = new Map();
    private readonly ttlMs: number;
    private readonly maxEntries: number;

    constructor(ttlMs: number = 24 * 60 * 60 * 1000, maxEntries: number = 10_000) {
        this.ttlMs = ttlMs;
        this.maxEntries = maxEntries;
    }

    getChat(id: number): Chat {
        const chat = this.chats.get(id);
        if (!chat) {
            return undefined;
        }
        if (chat.expiresAt <= Date.now()) {
            this.chats.delete(id);
            return undefined;
        }

        chat.expiresAt = Date.now() + this.ttlMs;
        this.chats.delete(id);
        this.chats.set(id, chat);
        return chat;
    }

    setMap(id: number, map: IBeatmap) {
        this.pruneExpired();
        this.chats.delete(id);
        this.chats.set(id, {
            id,
            map,
            expiresAt: Date.now() + this.ttlMs,
        });

        while (this.chats.size > this.maxEntries) {
            const oldest = this.chats.keys().next().value;
            if (oldest === undefined) {
                break;
            }
            this.chats.delete(oldest);
        }
    }

    removeChat(id: number): void {
        this.chats.delete(id);
    }

    private pruneExpired(): void {
        const now = Date.now();
        for (const [id, chat] of this.chats) {
            if (chat.expiresAt <= now) {
                this.chats.delete(id);
            }
        }
    }
}
