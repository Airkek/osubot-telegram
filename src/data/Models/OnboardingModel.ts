import Database from "../Database";

interface OnboardingScheme {
    user_id: number;
    version: number;
}

export const ONBOARDING_VERSION = 1;

export class OnboardingModel {
    private db: Database;
    private cache: Map<number, number>;
    private readonly cacheTTL: number;
    private lastUpdated: Map<number, number>;

    constructor(db: Database) {
        this.db = db;
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 6 hour
        this.lastUpdated = new Map();
    }

    async getUserOnboardingVersion(userId: number): Promise<number> {
        const now = Date.now();
        const lastUpdate = this.lastUpdated.get(userId) || 0;

        if (this.cache.has(userId) && now - lastUpdate < this.cacheTTL) {
            return this.cache.get(userId);
        }

        const status = await this.db.get<OnboardingScheme>("SELECT * FROM onboarded_users WHERE user_id = $1", [
            userId,
        ]);

        const version = status ? status.version : 0;
        this.cache.set(userId, version);
        this.lastUpdated.set(userId, now);

        return version;
    }

    async isUserNeedOnboarding(userId: number): Promise<boolean> {
        const version = await this.getUserOnboardingVersion(userId);
        return version < ONBOARDING_VERSION;
    }

    async userOnboarded(userId: number, version: number): Promise<void> {
        const oldVer = await this.getUserOnboardingVersion(userId);
        if (oldVer != 0) {
            await this.db.run("UPDATE onboarded_users SET version = $2 WHERE user_id = $1", [userId, version]);
        } else {
            await this.db.run("INSERT INTO onboarded_users (user_id, version) VALUES ($1, $2)", [userId, version]);
        }

        this.cache.delete(userId);
        this.lastUpdated.delete(userId);
    }

    clearCache(): void {
        this.cache.clear();
        this.lastUpdated.clear();
    }
}
