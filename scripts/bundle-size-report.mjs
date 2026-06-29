import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIR = "dist";
const ASSET_DIR = join(DIST_DIR, "assets");

// Budget thresholds (gzip bytes). Adjust as the app grows.
const BUDGET = {
  /** Largest single JS chunk (gzip). */
  maxChunkGzip: parseInt(process.env.BUNDLE_MAX_CHUNK_GZIP ?? String(250 * 1024), 10),
  /** Total JS across all chunks (gzip). */
  maxTotalJsGzip: parseInt(process.env.BUNDLE_MAX_TOTAL_JS_GZIP ?? String(500 * 1024), 10),
};

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
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

const files = await collectFiles(ASSET_DIR);
const rows = [];

for (const file of files) {
  const info = await stat(file);
  const source = await readFile(file);
  rows.push({
    file: relative(DIST_DIR, file).replaceAll("\\", "/"),
    raw: info.size,
    gzip: gzipSync(source).length,
  });
}

rows.sort((a, b) => b.raw - a.raw);

const totals = rows.reduce(
  (sum, row) => ({ raw: sum.raw + row.raw, gzip: sum.gzip + row.gzip }),
  { raw: 0, gzip: 0 },
);

const jsRows = rows.filter((r) => r.file.endsWith(".js"));
const totalJsGzip = jsRows.reduce((s, r) => s + r.gzip, 0);
const maxChunkGzip = jsRows.reduce((max, r) => Math.max(max, r.gzip), 0);

// ── Report ────────────────────────────────────────────────────────────────────
console.log("Bundle size report");
console.log("==================");
console.log(`Assets: ${rows.length}`);
console.log(`Total raw: ${formatKb(totals.raw)}`);
console.log(`Total gzip: ${formatKb(totals.gzip)}`);
console.log("");
console.log("| Asset | Raw | Gzip |");
console.log("| --- | ---: | ---: |");
for (const row of rows) {
  console.log(`| ${row.file} | ${formatKb(row.raw)} | ${formatKb(row.gzip)} |`);
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
