import { describe, expect, test } from "@jest/globals";
import {
    getContentOutputByPayloadCode,
    getDefaultContentOutput,
    getSupportedContentOutputs,
    isContentOutputSupported,
} from "../src/core/ContentOutput";

describe("platform content output capabilities", () => {
    test("uses platform-specific defaults", () => {
        expect(getDefaultContentOutput("telegram")).toBe("oki-cards");
        expect(getDefaultContentOutput("vk")).toBe("legacy-text");
    });

    test.each(["telegram", "vk"] as const)("lists only modes supported by %s", (platform) => {
        expect(getSupportedContentOutputs(platform)).toEqual(["oki-cards", "legacy-text"]);
        expect(isContentOutputSupported(platform, "oki-cards")).toBe(true);
        expect(isContentOutputSupported(platform, "legacy-text")).toBe(true);
        expect(isContentOutputSupported(platform, "discord-rich-text")).toBe(false);
    });

    test("keeps existing compact button payload codes", () => {
        expect(getContentOutputByPayloadCode("g1")).toBe("legacy-text");
        expect(getContentOutputByPayloadCode("g2")).toBe("oki-cards");
        expect(getContentOutputByPayloadCode("g3")).toBeUndefined();
    });
});
