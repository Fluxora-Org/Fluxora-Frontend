import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SECURITY_HEADERS } from "../securityHeaders";

const vercelConfigPath = resolve(process.cwd(), "vercel.json");

type VercelHeaderEntry = { key: string; value: string };
type VercelHeaderRule = { source: string; headers: VercelHeaderEntry[] };

function readVercelConfig(): { headers?: VercelHeaderRule[] } {
  return JSON.parse(readFileSync(vercelConfigPath, "utf8"));
}

describe("vercel.json security headers", () => {
  it("declares a headers block", () => {
    const config = readVercelConfig();
    expect(Array.isArray(config.headers)).toBe(true);
    expect(config.headers!.length).toBeGreaterThan(0);
  });

  it("applies every SECURITY_HEADERS entry to the catch-all route", () => {
    const config = readVercelConfig();
    const catchAll = config.headers!.find((r) => r.source === "/(.*)");
    expect(catchAll).toBeDefined();

    const served = new Map(catchAll!.headers.map((h) => [h.key.toLowerCase(), h.value]));
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(served.get(name.toLowerCase()), `missing or drifted header: ${name}`).toBe(value);
    }
  });

  it("keeps the embed route framable only where embedFramingPolicy allows it", () => {
    const config = readVercelConfig();
    const embed = config.headers!.find((r) => r.source.startsWith("/embed/"));
    expect(embed).toBeDefined();
    const csp = embed!.headers.find((h) => h.key.toLowerCase() === "content-security-policy");
    expect(csp).toBeDefined();
    expect(csp!.value).not.toMatch(/frame-ancestors\s+'none'/);
  });
});
