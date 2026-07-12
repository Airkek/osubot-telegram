import { ControllableFeature } from "core/storage/ControllableFeature";
import { IFeatureStatus } from "core/storage/IFeatureStatus";

export interface IFeatureFlags {
    isFeatureEnabled(feature: ControllableFeature): Promise<boolean>;
    enableFeature(feature: ControllableFeature): Promise<void>;
    disableFeature(feature: ControllableFeature): Promise<void>;
    listFeatures(): Promise<IFeatureStatus[]>;
    clearCache(): void;
}
