import { describe, expect, it } from "vitest";

import {
  LICENSE_ALLOWLIST,
  SEVERITY_ORDER,
  assertValidBaselineEntry,
  isBaselineExpired,
  licenseCandidates,
  licenseIsAllowed,
  meetsOrExceeds,
  severityRank,
} from "../supply-chain-policy.mjs";

describe("severityRank / meetsOrExceeds", () => {
  it("ranks severities in the documented order", () => {
    expect(severityRank("info")).toBe(0);
    expect(severityRank("low")).toBe(1);
    expect(severityRank("moderate")).toBe(2);
    expect(severityRank("high")).toBe(3);
    expect(severityRank("critical")).toBe(4);
  });

  it("ranks an unrecognised severity above critical (fail closed)", () => {
    expect(severityRank("unknown-severity")).toBeGreaterThan(
      severityRank("critical"),
    );
  });

  it.each([
    ["high", "high", true],
    ["critical", "high", true],
    ["moderate", "high", false],
    ["low", "moderate", false],
  ])("meetsOrExceeds(%s, %s) -> %s", (severity, threshold, expected) => {
    expect(meetsOrExceeds(severity, threshold)).toBe(expected);
  });

  it("treats an unrecognised severity as meeting any real threshold", () => {
    expect(meetsOrExceeds("mystery", "critical")).toBe(true);
  });
});

describe("assertValidBaselineEntry", () => {
  it("accepts a well-formed entry", () => {
    expect(() =>
      assertValidBaselineEntry("pkg", {
        severity: "high",
        reason: "tracked",
        reviewBy: "2026-12-01",
      }),
    ).not.toThrow();
  });

  it("throws when the entry is not an object", () => {
    expect(() => assertValidBaselineEntry("pkg", null)).toThrow(
      /must be an object/,
    );
    expect(() => assertValidBaselineEntry("pkg", "high")).toThrow(
      /must be an object/,
    );
  });

  it("throws when reason is missing", () => {
    expect(() =>
      assertValidBaselineEntry("pkg", { reviewBy: "2026-12-01" }),
    ).toThrow(/"reason"/);
  });

  it("throws when reviewBy is missing or unparsable", () => {
    expect(() => assertValidBaselineEntry("pkg", { reason: "x" })).toThrow(
      /"reviewBy"/,
    );
    expect(() =>
      assertValidBaselineEntry("pkg", { reason: "x", reviewBy: "not-a-date" }),
    ).toThrow(/"reviewBy"/);
  });
});

describe("isBaselineExpired", () => {
  it("is false when reviewBy is in the future", () => {
    const entry = { reviewBy: "2099-01-01" };
    expect(isBaselineExpired(entry, new Date("2026-01-01"))).toBe(false);
  });

  it("is true when reviewBy is in the past", () => {
    const entry = { reviewBy: "2020-01-01" };
    expect(isBaselineExpired(entry, new Date("2026-01-01"))).toBe(true);
  });

  it("treats the exact reviewBy instant as expired (boundary)", () => {
    const entry = { reviewBy: "2026-01-01T00:00:00.000Z" };
    expect(isBaselineExpired(entry, new Date("2026-01-01T00:00:00.000Z"))).toBe(
      false,
    );
    expect(isBaselineExpired(entry, new Date("2026-01-01T00:00:00.001Z"))).toBe(
      true,
    );
  });
});

describe("licenseCandidates", () => {
  it("returns an empty list for a missing license", () => {
    expect(licenseCandidates(null)).toEqual([]);
    expect(licenseCandidates(undefined)).toEqual([]);
    expect(licenseCandidates("")).toEqual([]);
  });

  it("returns a single candidate for a plain SPDX id", () => {
    expect(licenseCandidates("MIT")).toEqual(["MIT"]);
  });

  it("splits an OR expression, stripping parens", () => {
    expect(licenseCandidates("(MIT OR Apache-2.0)")).toEqual([
      "MIT",
      "Apache-2.0",
    ]);
  });

  it("splits an AND expression", () => {
    expect(licenseCandidates("MIT AND ISC")).toEqual(["MIT", "ISC"]);
  });
});

describe("licenseIsAllowed", () => {
  it("allows every license actually present in the current production tree", () => {
    for (const license of ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause"]) {
      expect(licenseIsAllowed(license, LICENSE_ALLOWLIST)).toBe(true);
    }
  });

  it("rejects a copyleft license", () => {
    expect(licenseIsAllowed("GPL-3.0", LICENSE_ALLOWLIST)).toBe(false);
  });

  it("rejects a missing license (fail closed)", () => {
    expect(licenseIsAllowed(null, LICENSE_ALLOWLIST)).toBe(false);
    expect(licenseIsAllowed(undefined, LICENSE_ALLOWLIST)).toBe(false);
  });

  it("allows a compound expression if any candidate is on the allowlist", () => {
    expect(licenseIsAllowed("(GPL-3.0 OR MIT)", LICENSE_ALLOWLIST)).toBe(true);
  });

  it("rejects a compound expression when no candidate is allowed", () => {
    expect(licenseIsAllowed("(GPL-3.0 OR AGPL-3.0)", LICENSE_ALLOWLIST)).toBe(
      false,
    );
  });
});

describe("SEVERITY_ORDER", () => {
  it("is exported as documented, low to high", () => {
    expect(SEVERITY_ORDER).toEqual([
      "info",
      "low",
      "moderate",
      "high",
      "critical",
    ]);
  });
});
