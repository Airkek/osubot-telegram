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
            "indent"           : [1, 4],
            "no-else-return"   : 1,
            "semi"             : [1, "always"],
            "space-unary-ops"  : 2,
            "curly"            : 1,
            "brace-style"      : 1,
            "keyword-spacing"  : 1,
            "no-multi-spaces"  : 1,
            "no-multiple-empty-lines": [1, {max: 1}]
        }
    },
    {languageOptions: { globals: globals.browser }},
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
];