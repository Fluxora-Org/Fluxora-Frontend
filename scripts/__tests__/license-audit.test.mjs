import { describe, expect, it } from "vitest";

import {
  collectProductionPackages,
  evaluateLicenses,
  packageNameFromKey,
  parseBaseline,
} from "../license-audit.mjs";

describe("packageNameFromKey", () => {
  it("extracts a plain package name", () => {
    expect(packageNameFromKey("node_modules/semver")).toBe("semver");
  });

  it("extracts a scoped package name", () => {
    expect(packageNameFromKey("node_modules/@stellar/stellar-sdk")).toBe(
      "@stellar/stellar-sdk",
    );
  });

  it("extracts the innermost name from a nested install", () => {
    expect(
      packageNameFromKey("node_modules/@babel/core/node_modules/semver"),
    ).toBe("semver");
  });

  it("extracts a nested scoped package name", () => {
    expect(
      packageNameFromKey(
        "node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/@emnapi/core",
      ),
    ).toBe("@emnapi/core");
  });
});

describe("collectProductionPackages", () => {
  it("excludes the root project entry", () => {
    const lockfile = { packages: { "": { name: "app", dependencies: {} } } };
    expect(collectProductionPackages(lockfile)).toEqual([]);
  });

  it("excludes dev-only packages", () => {
    const lockfile = {
      packages: {
        "node_modules/dev-only": {
          version: "1.0.0",
          license: "MIT",
          dev: true,
        },
      },
    };
    expect(collectProductionPackages(lockfile)).toEqual([]);
  });

  it("includes production packages with their license and version", () => {
    const lockfile = {
      packages: {
        "node_modules/react": { version: "18.2.0", license: "MIT" },
      },
    };
    expect(collectProductionPackages(lockfile)).toEqual([
      { name: "react", version: "18.2.0", license: "MIT" },
    ]);
  });

  it("treats a missing license field as null rather than throwing", () => {
    const lockfile = {
      packages: { "node_modules/mystery": { version: "1.0.0" } },
    };
    expect(collectProductionPackages(lockfile)).toEqual([
      { name: "mystery", version: "1.0.0", license: null },
    ]);
  });

  it("deduplicates identical name+version+license entries across install locations", () => {
    const lockfile = {
      packages: {
        "node_modules/semver": { version: "7.0.0", license: "ISC" },
        "node_modules/@babel/core/node_modules/semver": {
          version: "7.0.0",
          license: "ISC",
        },
      },
    };
    expect(collectProductionPackages(lockfile)).toEqual([
      { name: "semver", version: "7.0.0", license: "ISC" },
    ]);
  });

  it("keeps distinct entries when the same name resolves to different versions", () => {
    const lockfile = {
      packages: {
        "node_modules/semver": { version: "7.0.0", license: "ISC" },
        "node_modules/@babel/core/node_modules/semver": {
          version: "6.3.0",
          license: "ISC",
        },
      },
    };
    expect(collectProductionPackages(lockfile)).toHaveLength(2);
  });
});

describe("evaluateLicenses", () => {
  const allowlist = new Set(["MIT", "ISC"]);

  it("passes when every package is on the allowlist", () => {
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "MIT" }],
      { allowlist },
    );
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("fails a disallowed license with no baseline coverage (new finding)", () => {
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "GPL-3.0" }],
      { allowlist, baseline: { licenses: {} } },
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0]).toMatchObject({
      name: "a",
      license: "GPL-3.0",
    });
  });

  it("fails a missing license (fail closed)", () => {
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: null }],
      { allowlist, baseline: { licenses: {} } },
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0].license).toMatch(/UNKNOWN/);
  });

  it("passes a disallowed license covered by a valid baseline entry", () => {
    const baseline = {
      licenses: { a: { reason: "reviewed", reviewBy: "2099-01-01" } },
    };
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "GPL-3.0" }],
      { allowlist, baseline },
    );
    expect(result.passed).toBe(true);
    expect(result.baselined).toHaveLength(1);
  });

  it("fails once a baseline entry has expired", () => {
    const baseline = {
      licenses: { a: { reason: "reviewed", reviewBy: "2020-01-01" } },
    };
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "GPL-3.0" }],
      { allowlist, baseline },
    );
    expect(result.passed).toBe(false);
    expect(result.violations[0].reason).toMatch(/expired/);
  });

  it("respects an --allow exemption regardless of license or baseline", () => {
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "GPL-3.0" }],
      { allowlist, baseline: { licenses: {} }, exemptions: new Set(["a"]) },
    );
    expect(result.passed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.baselined).toEqual([]);
  });

  it("evaluates a compound OR license expression leniently", () => {
    const result = evaluateLicenses(
      [{ name: "a", version: "1.0.0", license: "(GPL-3.0 OR MIT)" }],
      { allowlist },
    );
    expect(result.passed).toBe(true);
  });

  it("reports totalChecked matching the input list length", () => {
    const result = evaluateLicenses(
      [
        { name: "a", version: "1.0.0", license: "MIT" },
        { name: "b", version: "1.0.0", license: "ISC" },
      ],
      { allowlist },
    );
    expect(result.totalChecked).toBe(2);
  });
});

describe("parseBaseline", () => {
  it("parses a well-formed licenses baseline", () => {
    const raw = JSON.stringify({
      licenses: { a: { reason: "x", reviewBy: "2099-01-01" } },
    });
    expect(parseBaseline(raw)).toEqual({
      licenses: { a: { reason: "x", reviewBy: "2099-01-01" } },
    });
  });

  it("throws on a malformed entry", () => {
    const raw = JSON.stringify({ licenses: { a: { reason: "x" } } });
    expect(() => parseBaseline(raw)).toThrow(/"reviewBy"/);
  });

  it("defaults to an empty licenses map when absent", () => {
    expect(parseBaseline("{}")).toEqual({ licenses: {} });
  });
});
