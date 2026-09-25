#!/usr/bin/env node
/**
 * license-audit.mjs
 *
 * Reads the committed package-lock.json (the lockfile CI actually installs
 * from via `npm ci`) and fails the build when a production dependency's
 * license is not on LICENSE_ALLOWLIST and is not covered by a current,
 * non-expired entry in scripts/supply-chain-baseline.json.
 *
 * Dev-only dependencies (npm lockfile `"dev": true` entries) are excluded
 * entirely — see docs/supply-chain-policy.md for the rationale.
 *
 * Usage:
 *   node scripts/license-audit.mjs
 *   node scripts/license-audit.mjs --allow some-package   # repeatable, temporary exemption
 *   node scripts/license-audit.mjs --lockfile path/to/package-lock.json
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

import {
  LICENSE_ALLOWLIST,
  assertValidBaselineEntry,
  isBaselineExpired,
  licenseIsAllowed,
} from "./supply-chain-policy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOCKFILE_PATH = join(__dirname, "..", "package-lock.json");
const BASELINE_PATH = join(__dirname, "supply-chain-baseline.json");

// ---------------------------------------------------------------------------
// Baseline loading (shared shape with vulnerability-audit.mjs's baseline file)
// ---------------------------------------------------------------------------

export function parseBaseline(raw) {
  const data = JSON.parse(raw);
  const licenses = data.licenses ?? {};
  for (const [key, entry] of Object.entries(licenses)) {
    assertValidBaselineEntry(key, entry);
  }
  return { licenses };
}

export async function loadBaseline(path = BASELINE_PATH) {
  const raw = await readFile(path, "utf8");
  return parseBaseline(raw);
}

// ---------------------------------------------------------------------------
// Lockfile parsing
// ---------------------------------------------------------------------------

/**
 * Extracts the package name from an npm v3-lockfile `packages` key, e.g.
 * "node_modules/@babel/core/node_modules/semver" -> "semver"
 * "node_modules/@stellar/stellar-sdk" -> "@stellar/stellar-sdk"
 */
export function packageNameFromKey(key) {
  const segments = key.split("node_modules/");
  return segments[segments.length - 1];
}

/**
 * Returns the production dependency closure from a parsed package-lock.json:
 * every entry except the root project and any entry npm marked `dev: true`.
 * This mirrors `npm audit --omit=dev` / `pnpm audit --prod`'s scope exactly,
 * since npm computes that same `dev` flag when resolving the tree.
 */
export function collectProductionPackages(lockfile) {
  const packages = lockfile.packages ?? {};
  const seen = new Map();

  for (const [key, meta] of Object.entries(packages)) {
    if (key === "") continue; // the root project entry itself
    if (meta?.dev === true) continue; // dev-only — out of scope by design

    const name = packageNameFromKey(key);
    const dedupeKey = `${name}@${meta.version ?? "unknown"}@${meta.license ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.set(dedupeKey, {
      name,
      version: meta.version ?? "unknown",
      license: meta.license ?? null,
    });
  }

  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Pure evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates the production package list against the license allowlist and
 * baseline. A package fails only when its license is disallowed AND it is
 * not covered by an `--allow`-exempted name or a valid, non-expired baseline
 * entry.
 */
export function evaluateLicenses(
  productionPackages,
  {
    allowlist = LICENSE_ALLOWLIST,
    baseline = { licenses: {} },
    exemptions = new Set(),
  } = {},
) {
  const violations = [];
  const baselined = [];

  for (const pkg of productionPackages) {
    if (exemptions.has(pkg.name)) continue;
    if (licenseIsAllowed(pkg.license, allowlist)) continue;

    const baseEntry = baseline.licenses?.[pkg.name];
    if (baseEntry && !isBaselineExpired(baseEntry)) {
      baselined.push({
        name: pkg.name,
        license: pkg.license,
        reason: baseEntry.reason,
        reviewBy: baseEntry.reviewBy,
      });
      continue;
    }

    violations.push({
      name: pkg.name,
      version: pkg.version,
      license: pkg.license ?? "UNKNOWN (missing license field)",
      reason: !baseEntry
        ? "not on the license allowlist and not present in scripts/supply-chain-baseline.json"
        : `baseline entry expired on ${baseEntry.reviewBy}`,
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    baselined,
    totalChecked: productionPackages.length,
  };
}

// ---------------------------------------------------------------------------
// CLI glue
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const exemptions = new Set();
  let lockfilePath = DEFAULT_LOCKFILE_PATH;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--allow" && argv[i + 1]) {
      exemptions.add(argv[++i]);
    } else if (argv[i] === "--lockfile" && argv[i + 1]) {
      lockfilePath = argv[++i];
    }
  }
  return { exemptions, lockfilePath };
}

async function main() {
  const { exemptions, lockfilePath } = parseArgs(process.argv.slice(2));

  const [lockfileRaw, baseline] = await Promise.all([
    readFile(lockfilePath, "utf8"),
    loadBaseline(),
  ]);
  const lockfile = JSON.parse(lockfileRaw);

  const productionPackages = collectProductionPackages(lockfile);
  const result = evaluateLicenses(productionPackages, { baseline, exemptions });

  console.log("License audit (production dependencies only)");
  console.log("==============================================");
  console.log(`Lockfile: ${lockfilePath}`);
  console.log(`Production packages checked: ${result.totalChecked}`);
  if (exemptions.size > 0) {
    console.log(`Exempted (--allow): ${[...exemptions].join(", ")}`);
  }
  console.log(`Baselined (reviewed, non-blocking): ${result.baselined.length}`);
  for (const entry of result.baselined) {
    console.log(
      `  • ${entry.name} (${entry.license}) — ${entry.reason} [review by ${entry.reviewBy}]`,
    );
  }

  if (result.violations.length > 0) {
    console.error("");
    console.error(
      `❌ ${result.violations.length} disallowed license finding(s):`,
    );
    for (const v of result.violations) {
      console.error(`  • ${v.name}@${v.version} — ${v.license} — ${v.reason}`);
    }
    console.error(
      "\nRemove/replace the dependency, or add a reviewed entry to scripts/supply-chain-baseline.json with a reason and reviewBy date.",
    );
    process.exitCode = 1;
    return;
  }

  console.log("\n✅ No disallowed license findings.");
}

// Only run when invoked directly (`node scripts/license-audit.mjs`), not when
// imported by tests to exercise the pure functions above.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
