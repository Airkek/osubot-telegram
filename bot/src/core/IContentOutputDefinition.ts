import { Platform } from "core/Platform";

export interface IContentOutputDefinition {
    readonly labelKey: string;
    readonly payloadCode: string;
    readonly platforms: readonly Platform[];
    readonly requiredFeature?: "oki-cards";
}
