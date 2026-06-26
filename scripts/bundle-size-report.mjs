import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIR = "dist";
const ASSET_DIR = join(DIST_DIR, "assets");
const REPORT_PATH =
  process.env.BUNDLE_SIZE_REPORT_PATH ?? join(DIST_DIR, "bundle-size-report.md");

function readBudgetKb(envName, defaultKb) {
  const rawValue = process.env[envName];
  if (rawValue === undefined || rawValue.trim() === "") return defaultKb * 1024;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number of kilobytes.`);
  }

  return parsed * 1024;
}

const budgets = {
  totalJsGzip: readBudgetKb("BUNDLE_TOTAL_JS_GZIP_BUDGET_KB", 230),
  jsChunkGzip: readBudgetKb("BUNDLE_JS_CHUNK_GZIP_BUDGET_KB", 95),
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
  (sum, row) => ({
    raw: sum.raw + row.raw,
    gzip: sum.gzip + row.gzip,
  }),
  { raw: 0, gzip: 0 },
);
const jsRows = rows.filter((row) => row.file.endsWith(".js"));
const jsTotals = jsRows.reduce(
  (sum, row) => ({
    raw: sum.raw + row.raw,
    gzip: sum.gzip + row.gzip,
  }),
  { raw: 0, gzip: 0 },
);
const violations = [];

if (jsTotals.gzip > budgets.totalJsGzip) {
  violations.push(
    `Total JS gzip ${formatKb(jsTotals.gzip)} exceeds budget ${formatKb(
      budgets.totalJsGzip,
    )}.`,
  );
}

for (const row of jsRows) {
  if (row.gzip > budgets.jsChunkGzip) {
    violations.push(
      `${row.file} gzip ${formatKb(row.gzip)} exceeds per-chunk budget ${formatKb(
        budgets.jsChunkGzip,
      )}.`,
    );
  }
}

const reportLines = [
  "Bundle size report",
  "==================",
  `Assets: ${rows.length}`,
  `Total raw: ${formatKb(totals.raw)}`,
  `Total gzip: ${formatKb(totals.gzip)}`,
  `Total JS gzip: ${formatKb(jsTotals.gzip)} / ${formatKb(budgets.totalJsGzip)} budget`,
  `Largest JS chunk gzip budget: ${formatKb(budgets.jsChunkGzip)}`,
  "",
  violations.length === 0 ? "Budget status: PASS" : "Budget status: FAIL",
  "",
  "| Asset | Raw | Gzip |",
  "| --- | ---: | ---: |",
];

for (const row of rows) {
  reportLines.push(`| ${row.file} | ${formatKb(row.raw)} | ${formatKb(row.gzip)} |`);
}

if (violations.length > 0) {
  reportLines.push("", "Budget violations:");
  for (const violation of violations) {
    reportLines.push(`- ${violation}`);
  }
}

const report = `${reportLines.join("\n")}\n`;
console.log(report);

await mkdir(dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, report, "utf8");

if (violations.length > 0) {
  console.error("Bundle budget exceeded:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}
