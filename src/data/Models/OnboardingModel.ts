import { SqlExecutor } from "../SqlExecutor";
import { ONBOARDING_VERSION } from "../../core/ApplicationStorage";

export { ONBOARDING_VERSION } from "../../core/ApplicationStorage";

interface OnboardingScheme {
    platform_account_id: number;
    version: number;
}

export class OnboardingModel {
    private db: SqlExecutor;
    private cache: Map<number, number>;
    private readonly cacheTTL: number;
    private lastUpdated: Map<number, number>;

    constructor(db: SqlExecutor) {
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

        const status = await this.db.get<OnboardingScheme>(
            "SELECT platform_account_id, version FROM onboarded_users WHERE platform_account_id = $1",
            [userId]
        );

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
        await this.db.run(
            `INSERT INTO onboarded_users (platform_account_id, version)
             VALUES ($1, $2)
             ON CONFLICT (platform_account_id) DO UPDATE SET version = EXCLUDED.version`,
            [userId, version]
        );

        this.cache.delete(userId);
        this.lastUpdated.delete(userId);
    }

    clearCache(): void {
        this.cache.clear();
        this.lastUpdated.clear();
    }
}
