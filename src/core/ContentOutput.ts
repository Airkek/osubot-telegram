import { Platform } from "./Identity";

export interface ContentOutputDefinition {
    readonly labelKey: string;
    readonly payloadCode: string;
    readonly platforms: readonly Platform[];
    readonly requiredFeature?: "oki-cards";
}

export const CONTENT_OUTPUT_MODES = {
    "oki-cards": {
        labelKey: "output-style-oki-cards",
        payloadCode: "g2",
        platforms: ["telegram", "vk"],
        requiredFeature: "oki-cards",
    },
    "legacy-text": {
        labelKey: "output-style-text",
        payloadCode: "g1",
        platforms: ["telegram", "vk"],
    },
} as const satisfies Record<string, ContentOutputDefinition>;

export type ContentOutput = keyof typeof CONTENT_OUTPUT_MODES;

const DEFAULT_CONTENT_OUTPUT: Record<Platform, ContentOutput> = {
    telegram: "oki-cards",
    vk: "legacy-text",
};

export function isContentOutput(value: unknown): value is ContentOutput {
    return typeof value === "string" && value in CONTENT_OUTPUT_MODES;
}

export function getContentOutputDefinition(output: ContentOutput): ContentOutputDefinition {
    return CONTENT_OUTPUT_MODES[output];
}

export function getSupportedContentOutputs(platform: Platform): ContentOutput[] {
    return (Object.keys(CONTENT_OUTPUT_MODES) as ContentOutput[]).filter((output) =>
        CONTENT_OUTPUT_MODES[output].platforms.includes(platform)
    );
}

export function isContentOutputSupported(platform: Platform, output: unknown): output is ContentOutput {
    return isContentOutput(output) && CONTENT_OUTPUT_MODES[output].platforms.includes(platform);
}

export function getDefaultContentOutput(platform: Platform): ContentOutput {
    return DEFAULT_CONTENT_OUTPUT[platform];
}

export function getContentOutputByPayloadCode(payloadCode: string): ContentOutput | undefined {
    return (Object.keys(CONTENT_OUTPUT_MODES) as ContentOutput[]).find(
        (output) => CONTENT_OUTPUT_MODES[output].payloadCode === payloadCode
    );
}
