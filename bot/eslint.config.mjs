import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier/recommended";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { ignores: ["build/**"] },
    prettier,
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        ignores: ["src/platforms/telegram/**/*.ts", "src/platforms/vk/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["grammy", "grammy/*", "@grammyjs/*", "vk-io", "vk-io/*"],
                            message: "Platform transport dependencies belong in their platform adapter only.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/platforms/telegram/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["vk-io", "vk-io/*"],
                            message: "VK transport dependencies belong in the VK adapter only.",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/platforms/vk/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["grammy", "grammy/*", "@grammyjs/*"],
                            message: "Telegram transport dependencies belong in the Telegram adapter only.",
                        },
                    ],
                },
            ],
        },
    },
];
