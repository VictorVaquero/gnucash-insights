// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactPerf from "eslint-plugin-react-perf";
import reactRefresh from "eslint-plugin-react-refresh";
import storybook from "eslint-plugin-storybook";
import reactYouMightNotNeedAnEffect from "eslint-plugin-react-you-might-not-need-an-effect";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "dist-ssr/**", "storybook-static/**", "src/routeTree.gen.ts"],
  },
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  reactHooks.configs["recommended-latest"],
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-perf": reactPerf },
    rules: {
      "react-perf/jsx-no-new-object-as-prop": "warn",
      "react-perf/jsx-no-new-array-as-prop": "warn",
      "react-perf/jsx-no-new-function-as-prop": "warn",
    },
  },
  reactYouMightNotNeedAnEffect.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
      },
    },
  },
  {
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
    plugins: {
      "react-refresh": reactRefresh,
    },
  },
  ...storybook.configs["flat/recommended"],
  eslintConfigPrettier,
);
