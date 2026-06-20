import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const DIST_DIR = "dist";
const ASSET_DIR = join(DIST_DIR, "assets");

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
