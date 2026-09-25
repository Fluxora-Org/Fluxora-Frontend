import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getWalletWatchIntervalMs,
  resolveWalletWatchIntervalMs,
  WALLET_WATCH_DEFAULT_INTERVAL_MS,
  WALLET_WATCH_MIN_INTERVAL_MS,
} from "../config";

/**
 * Configuration boundary (issue #1722).
 *
 * `src/lib/config.ts` is the single place where the frontend reads
 * `import.meta.env`. Components, pages, and hooks must consume configuration
 * through that module so every value is validated once and can be exercised
 * without mutating the environment.
 *
 * These are real static checks over the shipped source tree, so a future
 * `import.meta.env` read in the component layer fails the suite immediately.
 */

const SRC_ROOT = path.resolve(__dirname, "../../");
const REPO_ROOT = path.resolve(__dirname, "../../../");

/** Directories/files that form the React rendering layer. */
const COMPONENT_LAYER = [
  path.join(SRC_ROOT, "components"),
  path.join(SRC_ROOT, "pages"),
  path.join(SRC_ROOT, "hooks"),
  path.join(SRC_ROOT, "App.tsx"),
];

function isTestFile(filePath: string): boolean {
  return (
    /\.test\.(ts|tsx)$/.test(filePath) ||
    filePath.split(path.sep).includes("__tests__")
  );
}

function collectSourceFiles(target: string): string[] {
  if (!fs.existsSync(target)) return [];

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return isTestFile(target) ? [] : [target];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      files.push(...collectSourceFiles(entryPath));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !isTestFile(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

/**
 * Removes block and line comments so the boundary check inspects executable
 * code only — an ESLint AST rule never fires on a comment either.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function readSource(filePath: string): string {
  return stripComments(fs.readFileSync(filePath, "utf8"));
}

describe("configuration boundary", () => {
  const componentLayerFiles = COMPONENT_LAYER.flatMap(collectSourceFiles);

  it("finds the component-layer source files to scan", () => {
    // Guards against the scan silently passing because the glob found nothing.
    expect(componentLayerFiles.length).toBeGreaterThan(0);
  });

  it("no component, page, or hook reads import.meta.env directly", () => {
    const offenders = componentLayerFiles
      .filter((filePath) => readSource(filePath).includes("import.meta.env"))
      .map((filePath) => path.relative(REPO_ROOT, filePath));

    expect(offenders).toEqual([]);
  });

  it("keeps every environment read inside the config module", () => {
    const configPath = path.join(SRC_ROOT, "lib", "config.ts");
    expect(readSource(configPath)).toContain("import.meta.env");
  });

  it("configures an ESLint rule that forbids direct environment access in the component layer", () => {
    const eslintConfig = fs.readFileSync(
      path.join(REPO_ROOT, "eslint.config.js"),
      "utf8",
    );

    expect(eslintConfig).toContain("no-restricted-syntax");
    expect(eslintConfig).toContain('MetaProperty[meta.name="import"]');
    expect(eslintConfig).toContain("src/components/**/*.{ts,tsx}");
  });

  it("exposes config accessors instead of raw env values", () => {
    const configModule = fs.readFileSync(
      path.join(SRC_ROOT, "lib", "config.ts"),
      "utf8",
    );

    for (const accessor of [
      "readDemoModeFlag",
      "isProductionBuild",
      "getWalletWatchIntervalMs",
      "IS_DEV",
    ]) {
      expect(configModule).toContain(accessor);
    }
  });
});

describe("resolveWalletWatchIntervalMs", () => {
  it("falls back to the default for missing or invalid values", () => {
    expect(resolveWalletWatchIntervalMs(undefined)).toBe(
      WALLET_WATCH_DEFAULT_INTERVAL_MS,
    );
    expect(resolveWalletWatchIntervalMs("")).toBe(
      WALLET_WATCH_DEFAULT_INTERVAL_MS,
    );
    expect(resolveWalletWatchIntervalMs("fast")).toBe(
      WALLET_WATCH_DEFAULT_INTERVAL_MS,
    );
    expect(resolveWalletWatchIntervalMs("0")).toBe(
      WALLET_WATCH_DEFAULT_INTERVAL_MS,
    );
    expect(resolveWalletWatchIntervalMs("-500")).toBe(
      WALLET_WATCH_DEFAULT_INTERVAL_MS,
    );
  });

  it("clamps values below the minimum up to WALLET_WATCH_MIN_INTERVAL_MS", () => {
    expect(resolveWalletWatchIntervalMs("100")).toBe(
      WALLET_WATCH_MIN_INTERVAL_MS,
    );
    expect(resolveWalletWatchIntervalMs("500")).toBe(
      WALLET_WATCH_MIN_INTERVAL_MS,
    );
  });

  it("keeps valid configured values", () => {
    expect(resolveWalletWatchIntervalMs("5000")).toBe(5000);
  });

  it("reads the raw value from the provided environment", () => {
    expect(
      getWalletWatchIntervalMs({
        VITE_WALLET_WATCH_INTERVAL_MS: "3000",
      } as ImportMetaEnv),
    ).toBe(3000);

    expect(
      getWalletWatchIntervalMs({
        VITE_WALLET_WATCH_INTERVAL_MS: "50",
      } as ImportMetaEnv),
    ).toBe(WALLET_WATCH_MIN_INTERVAL_MS);
  });
});
