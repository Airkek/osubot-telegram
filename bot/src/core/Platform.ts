export const SUPPORTED_PLATFORMS = ["telegram", "vk"] as const;

export type Platform = (typeof SUPPORTED_PLATFORMS)[number];
