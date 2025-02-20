import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [

    {files: ["**/*.{js,mjs,cjs,ts}"],},
    {ignores: ["build/**"]},
    {
        rules: {
            "consistent-return": 2,
            "indent"           : [2, 4],
            "no-else-return"   : 2,
            "semi"             : [2, "always"],
            "space-unary-ops"  : 2,
            "curly"            : 2,
            "brace-style"      : 2,
            "keyword-spacing"  : 2,
            "no-multi-spaces"  : 2,
            "no-multiple-empty-lines": [2, {max: 1}]
        }
    },
    {languageOptions: { globals: globals.browser }},
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
];