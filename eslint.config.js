import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "contracts/**",
      "*.config.js",
      "*.config.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
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
    },
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
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
