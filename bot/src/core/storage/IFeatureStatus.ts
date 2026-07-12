import { ControllableFeature } from "core/storage/ControllableFeature";

export interface IFeatureStatus {
    feature: ControllableFeature;
    enabled_for_all: boolean;
}
