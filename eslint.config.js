import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import amountRules from "./eslint-rules/no-float-amount-arithmetic.js";
import suppressionRules from "./eslint-rules/require-ts-suppression-description.js";

// Test files are exempt from the general src lint rules, but every
// `@ts-ignore` / `@ts-expect-error` in them must still satisfy the suppression
// policy, so tests get a dedicated config that switches the two recommended
// rule sets off and enables only the suppression rule. (A config-level
// `ignores` list is used to keep tests out of the src rules rather than `!`
// negated globs, which ESLint flat config does not honour inside `files`.)
const recommendedRulesOff = {};
for (const config of [
  js.configs.recommended,
  ...tseslint.configs.recommended,
]) {
  for (const key of Object.keys(config.rules ?? {})) {
    recommendedRulesOff[key] = "off";
  }
}

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "contracts/**",
      "*.config.js",
      "*.config.ts",
      "scripts/**/*.test.mjs",
      "eslint-rules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        console: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        window: "readonly",
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      fluxora: suppressionRules,
    },
    rules: {
      "fluxora/require-ts-suppression-description": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-console": "error",
      "no-script-url": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: [
            "applyTheme",
            "initTheme",
            "isTheme",
            "resolveInitialTheme",
            "useTheme",
            "useToast",
            "useWallet",
          ],
        },
      ],
    },
  },
  // Configuration boundary (issue #1722): React components, pages, and hooks
  // must read configuration through `src/lib/config.ts`, never `import.meta.env`
  // directly, so values are validated in one place and testable without
  // manipulating the environment.
  {
    files: [
      "src/App.tsx",
      "src/components/**/*.{ts,tsx}",
      "src/pages/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: 'MetaProperty[meta.name="import"]',
          message:
            "Read configuration through src/lib/config.ts instead of import.meta.env — components must not bypass config validation.",
        },
      ],
    },
  },
  // Test files: exempt from the src lint rules above, but the TS suppression
  // policy still applies so stale or undescribed suppressions fail the PR.
  // `reportUnusedDisableDirectives` is off here so test-local eslint-disable
  // comments for rules that are not active in tests stay silent.
  {
    files: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      fluxora: suppressionRules,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      ...recommendedRulesOff,
      "fluxora/require-ts-suppression-description": "error",
    },
  },
  // Node-built scripts (e.g. bundle-size report, supply-chain audits) need Node globals.
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
      },
    },
  },
);
