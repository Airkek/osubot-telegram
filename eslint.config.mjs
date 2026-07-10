import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import preetier from "eslint-plugin-prettier/recommended";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { ignores: ["build/**"] },
    preetier,
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts"],
        ignores: ["src/Telegram/**/*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["grammy", "grammy/*", "@grammyjs/*", "**/Telegram/**"],
                            message: "Telegram transport dependencies belong in src/Telegram only.",
                        },
                    ],
                },
            ],
        },
    },
];
