import Database from "../Database";

export type ControllableFeature = "oki-cards" | "plaintext-overrides" | "admin-all-features";

interface FeatureControlSchema {
    feature: ControllableFeature;
    enabled_for_all: boolean;
}

export class FeatureControlModel {
    private db: Database;
    private cache: Map<ControllableFeature, boolean>;
    private readonly cacheTTL: number;
    private lastUpdated: Map<ControllableFeature, number>;

    constructor(db: Database) {
        this.db = db;
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 6 hour
        this.lastUpdated = new Map();
    }

    async isFeatureEnabled(feature: ControllableFeature): Promise<boolean> {
        const now = Date.now();
        const lastUpdate = this.lastUpdated.get(feature) || 0;

        if (this.cache.has(feature) && now - lastUpdate < this.cacheTTL) {
            return this.cache.get(feature)!;
        }

        const featureStatus: FeatureControlSchema = await this.db.get(
            "SELECT * FROM feature_control WHERE feature = $1",
            [feature]
        );

        const isEnabled = featureStatus && featureStatus.enabled_for_all;
        this.cache.set(feature, isEnabled);
        this.lastUpdated.set(feature, now);

        return isEnabled;
    }

    async enableFeature(feature: ControllableFeature): Promise<void> {
        await this.db.run("UPDATE feature_control SET enabled_for_all = true WHERE feature = $1", [feature]);
        this.cache.delete(feature);
        this.lastUpdated.delete(feature);
    }

    async disableFeature(feature: ControllableFeature): Promise<void> {
        await this.db.run("UPDATE feature_control SET enabled_for_all = false WHERE feature = $1", [feature]);
        this.cache.delete(feature);
        this.lastUpdated.delete(feature);
    }

    async listFeatures(): Promise<FeatureControlSchema[]> {
        return await this.db.all("SELECT * FROM feature_control");
    }

    clearCache(): void {
        this.cache.clear();
        this.lastUpdated.clear();
    }
}
