/**
 * bundle-size-report.mjs
 *
 * Scans the Vite/Rollup output in dist/assets, prints a formatted table of
 * every chunk and asset, and optionally fails the process when any JS chunk
 * exceeds CHUNK_SIZE_WARNING_LIMIT_KB (the same threshold set in vite.config.ts).
 *
 * Usage:
 *   node scripts/bundle-size-report.mjs            # report only
 *   node scripts/bundle-size-report.mjs --fail     # exit 1 if any chunk over limit
 *   node scripts/bundle-size-report.mjs --fail --allow vendor-react  # skip that chunk
 *
 * Flags:
 *   --fail              Exit with code 1 when any JS chunk exceeds the limit.
 *   --allow <name>      Temporarily exempt the named chunk (repeatable).
 *                       Use sparingly; add a rationale comment in CI config.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Threshold — must stay in sync with vite.config.ts `chunkSizeWarningLimit`.
// ---------------------------------------------------------------------------
const CHUNK_SIZE_WARNING_LIMIT_KB = 650;
const CHUNK_SIZE_WARNING_LIMIT_BYTES = CHUNK_SIZE_WARNING_LIMIT_KB * 1024;

const DIST_DIR = "dist";
const ASSET_DIR = join(DIST_DIR, "assets");

// ---------------------------------------------------------------------------
// Parse CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const failOnOversize = args.includes("--fail");

/** Set of chunk base-names to exempt from the hard limit. */
const allowedChunks = new Set();
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--allow" && args[i + 1]) {
    allowedChunks.add(args[++i]);
  }
}

// Budget thresholds (gzip bytes). Adjust as the app grows.
const BUDGET = {
  /** Largest single JS chunk (gzip). */
  maxChunkGzip: parseInt(process.env.BUNDLE_MAX_CHUNK_GZIP ?? String(250 * 1024), 10),
  /** Total JS across all chunks (gzip). */
  maxTotalJsGzip: parseInt(process.env.BUNDLE_MAX_TOTAL_JS_GZIP ?? String(500 * 1024), 10),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

/** Returns true for JS chunks (the files Rollup size-warns about). */
function isJsChunk(filename) {
  return filename.endsWith(".js");
}

/**
 * Returns the logical chunk name from a hashed filename, e.g.
 *   "assets/vendor-react-BxYz1234.js" → "vendor-react"
 * Falls back to the full basename when the pattern doesn't match.
 */
function chunkName(filePath) {
  const base = filePath.split("/").pop() ?? filePath;
  const match = base.match(/^(.+?)-[A-Za-z0-9]{8,}\.(js|css|mjs)$/);
  return match ? match[1] : base.replace(/\.[^.]+$/, "");
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return collectFiles(fullPath);
      if (!entry.isFile()) return [];
      return [fullPath];
    }),
  );
  return files.flat();
}

// ---------------------------------------------------------------------------
// Collect and analyse assets
// ---------------------------------------------------------------------------
const files = await collectFiles(ASSET_DIR);
const rows = [];

for (const file of files) {
  const info = await stat(file);
  const source = await readFile(file);
  const relPath = relative(DIST_DIR, file).replaceAll("\\", "/");
  const name = chunkName(relPath);
  const overLimit =
    isJsChunk(relPath) &&
    info.size > CHUNK_SIZE_WARNING_LIMIT_BYTES &&
    !allowedChunks.has(name);

  rows.push({
    file: relPath,
    name,
    raw: info.size,
    gzip: gzipSync(source).length,
    isJs: isJsChunk(relPath),
    overLimit,
    allowed: isJsChunk(relPath) && allowedChunks.has(name),
  });
}

rows.sort((a, b) => b.raw - a.raw);

const totals = rows.reduce(
  (sum, row) => ({ raw: sum.raw + row.raw, gzip: sum.gzip + row.gzip }),
  { raw: 0, gzip: 0 },
);

const oversized = rows.filter((r) => r.overLimit);

const jsRows = rows.filter((r) => r.file.endsWith(".js"));
const totalJsGzip = jsRows.reduce((s, r) => s + r.gzip, 0);
const maxChunkGzip = jsRows.reduce((max, r) => Math.max(max, r.gzip), 0);

// ---------------------------------------------------------------------------
// Print report
// ---------------------------------------------------------------------------
console.log("Bundle size report");
console.log("==================");
console.log(`Assets: ${rows.length}`);
console.log(`Total raw:  ${formatKb(totals.raw)}`);
console.log(`Total gzip: ${formatKb(totals.gzip)}`);
console.log(`Chunk limit: ${CHUNK_SIZE_WARNING_LIMIT_KB} kB`);
if (allowedChunks.size > 0) {
  console.log(`Allowed (exempt): ${[...allowedChunks].join(", ")}`);
}
console.log("");

// Table header
console.log("| Asset | Raw | Gzip | Status |");
console.log("| --- | ---: | ---: | :---: |");

for (const row of rows) {
  let status = "";
  if (row.isJs) {
    if (row.allowed) {
      status = "⚠ allowed";
    } else if (row.overLimit) {
      status = "✗ OVER LIMIT";
    } else {
      status = "✓ OK";
    }
  }
  console.log(`| ${row.file} | ${formatKb(row.raw)} | ${formatKb(row.gzip)} | ${status} |`);
}

// ---------------------------------------------------------------------------
// Fail-fast when --fail is set and oversized chunks exist
// ---------------------------------------------------------------------------
if (failOnOversize && oversized.length > 0) {
  console.log("");
  console.error(`\nERROR: ${oversized.length} chunk(s) exceed the ${CHUNK_SIZE_WARNING_LIMIT_KB} kB limit:\n`);
  for (const row of oversized) {
    console.error(
      `  • ${row.name}  →  ${formatKb(row.raw)} (limit ${CHUNK_SIZE_WARNING_LIMIT_KB} kB, over by ${formatKb(row.raw - CHUNK_SIZE_WARNING_LIMIT_BYTES)})`,
    );
  }
  console.error(
    "\nReduce the chunk size or, as a temporary measure, pass --allow <chunkName> with a rationale comment.",
  );
  process.exit(1);
}

// ── Budget check ──────────────────────────────────────────────────────────────
console.log("");
console.log("Budget check");
console.log("============");

const violations = [];

if (maxChunkGzip > BUDGET.maxChunkGzip) {
  violations.push(
    `Largest JS chunk: ${formatKb(maxChunkGzip)} exceeds budget of ${formatKb(BUDGET.maxChunkGzip)}`,
  );
}

if (totalJsGzip > BUDGET.maxTotalJsGzip) {
  violations.push(
    `Total JS (gzip): ${formatKb(totalJsGzip)} exceeds budget of ${formatKb(BUDGET.maxTotalJsGzip)}`,
  );
}

if (violations.length > 0) {
  console.error("❌ Bundle budget exceeded:");
  for (const v of violations) {
    console.error(`   • ${v}`);
  }
  process.exit(1);
} else {
  console.log(
    `✅ Within budget — largest chunk: ${formatKb(maxChunkGzip)} / ${formatKb(BUDGET.maxChunkGzip)},` +
    ` total JS: ${formatKb(totalJsGzip)} / ${formatKb(BUDGET.maxTotalJsGzip)}`,
  );
}
