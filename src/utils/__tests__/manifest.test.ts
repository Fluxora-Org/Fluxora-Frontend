import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface WebAppManifest {
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: ManifestIcon[];
}

const ROOT_DIR = path.resolve(__dirname, "../../..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "manifest.webmanifest");
const INDEX_HTML_PATH = path.join(ROOT_DIR, "index.html");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("Web App Manifest", () => {
  it("ships a single manifest at public/manifest.webmanifest and removes public/manifest.json", () => {
    expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, "manifest.json"))).toBe(false);
  });

  it("is linked from index.html without dev-only /src/public URLs", () => {
    const html = fs.readFileSync(INDEX_HTML_PATH, "utf-8");
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).not.toContain("/src/public");
  });

  it("contains all required PWA manifest members", () => {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
    expect(raw).not.toContain("/src/public");

    const manifest = JSON.parse(raw) as WebAppManifest;
    expect(manifest.name).toBe("Fluxora");
    expect(manifest.short_name).toBe("Fluxora");
    expect(manifest.start_url).toBe("/app");
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("includes 192x192, 512x512, and maskable PNG icons and every icon file exists", () => {
    const manifest = JSON.parse(
      fs.readFileSync(MANIFEST_PATH, "utf-8"),
    ) as WebAppManifest;

    const has192 = manifest.icons.some(
      (i) => i.sizes === "192x192" && i.type === "image/png",
    );
    const has512 = manifest.icons.some(
      (i) => i.sizes === "512x512" && i.type === "image/png",
    );
    const hasMaskable = manifest.icons.some((i) =>
      i.purpose?.split(/\s+/).includes("maskable"),
    );

    expect(has192).toBe(true);
    expect(has512).toBe(true);
    expect(hasMaskable).toBe(true);

    for (const icon of manifest.icons) {
      expect(icon.src.startsWith("/")).toBe(true);
      expect(icon.src).not.toContain("/src/public");

      const filePath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ""));
      expect(fs.existsSync(filePath), `Missing icon file: ${icon.src}`).toBe(true);

      if (icon.type === "image/png") {
        const buf = fs.readFileSync(filePath);
        expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        expect(`${width}x${height}`).toBe(icon.sizes);
      }
    }
  });
});
