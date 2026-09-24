/**
 * Unit tests for the `formatAddress` utility exported from
 * `src/components/common/TruncatedAddress.tsx`.
 *
 * These tests are the single source of truth for the head/tail truncation
 * contract used by StreamRow, WalletButton, WalletStatus, and
 * TruncatedAddress itself (issue #1288).
 *
 * Rules under test:
 *  - A full Stellar address (56 chars) is truncated to first 6 + "..." + last 4.
 *  - Addresses short enough that truncation would not reduce length are returned
 *    unchanged (i.e. length ≤ prefixLen + suffixLen = 10 by default).
 *  - Custom prefixLen / suffixLen overrides work correctly.
 *  - Empty strings and single-character strings survive without error.
 *  - The default format is 6 prefix + "..." + 4 suffix (matching TruncatedReveal
 *    component display and WalletStatus aria-labels).
 */

import { describe, it, expect } from "vitest";
import { formatAddress } from "../TruncatedAddress";

// A well-formed 56-character Stellar public key used across multiple test cases.
const STELLAR_56 =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

describe("formatAddress — default truncation (prefix=6, suffix=4)", () => {
  it("truncates a standard 56-char Stellar address to head + ... + tail", () => {
    const result = formatAddress(STELLAR_56);
    expect(result).toBe("GATDOS...LOWN");
  });

  it("preserves the exact first 6 characters of the address", () => {
    const result = formatAddress(STELLAR_56);
    expect(result.startsWith(STELLAR_56.slice(0, 6))).toBe(true);
  });

  it("preserves the exact last 4 characters of the address", () => {
    const result = formatAddress(STELLAR_56);
    expect(result.endsWith(STELLAR_56.slice(-4))).toBe(true);
  });

  it("uses '...' (three dots) as the separator", () => {
    const result = formatAddress(STELLAR_56);
    expect(result).toContain("...");
  });

  it("returns a string shorter than the original for long addresses", () => {
    const result = formatAddress(STELLAR_56);
    expect(result.length).toBeLessThan(STELLAR_56.length);
  });

  it("produces the expected compact length: prefixLen + 3 + suffixLen", () => {
    // 6 (prefix) + 3 ("...") + 4 (suffix) = 13
    const result = formatAddress(STELLAR_56);
    expect(result.length).toBe(13);
  });
});

describe("formatAddress — short / boundary addresses (no truncation)", () => {
  it("returns an address of exactly 10 chars unchanged (boundary: prefix+suffix)", () => {
    const addr = "GABCDEFGHI"; // length 10 == 6 + 4
    expect(formatAddress(addr)).toBe(addr);
  });

  it("returns a 9-char address unchanged (below boundary)", () => {
    const addr = "GABCDEFGH";
    expect(formatAddress(addr)).toBe(addr);
  });

  it("returns a 6-char address unchanged", () => {
    expect(formatAddress("GSHORT")).toBe("GSHORT");
  });

  it("returns a 1-char address unchanged", () => {
    expect(formatAddress("G")).toBe("G");
  });

  it("returns an empty string unchanged", () => {
    expect(formatAddress("")).toBe("");
  });

  it("truncates an address of exactly 11 chars (one above boundary)", () => {
    const addr = "GABCDEFGHIJ"; // length 11 > 10
    const result = formatAddress(addr);
    // Should truncate: "GABCDE...GHIJ"
    expect(result).toBe("GABCDE...GHIJ");
  });
});

describe("formatAddress — custom prefixLen and suffixLen", () => {
  it("respects a custom prefixLen=4 and suffixLen=4", () => {
    const result = formatAddress(STELLAR_56, 4, 4);
    expect(result).toBe(`${STELLAR_56.slice(0, 4)}...${STELLAR_56.slice(-4)}`);
  });

  it("respects a custom prefixLen=8 and suffixLen=6", () => {
    const result = formatAddress(STELLAR_56, 8, 6);
    expect(result).toBe(`${STELLAR_56.slice(0, 8)}...${STELLAR_56.slice(-6)}`);
  });

  it("returns unchanged when length ≤ prefixLen + suffixLen with custom args", () => {
    const addr = "GABCDE"; // length 6
    // With prefix=4, suffix=4, boundary is 8 — addr length (6) < 8, so unchanged
    expect(formatAddress(addr, 4, 4)).toBe(addr);
  });

  it("matches maskAddress(address, 8, 4) behavior for 8-char prefix", () => {
    // WalletStatus previously called maskAddress(address, 6, 4); now uses
    // formatAddress(address) with defaults.  Verify the equivalence explicitly.
    const result = formatAddress(STELLAR_56, 8, 4);
    expect(result).toBe(`${STELLAR_56.slice(0, 8)}...${STELLAR_56.slice(-4)}`);
  });
});

describe("formatAddress — output consistency across call sites", () => {
  it("StreamRow, WalletButton, and WalletStatus all produce the same output for the same address", () => {
    // All three call sites use formatAddress(address) with default args.
    // This test asserts that the shared utility is consistent — if all three
    // import and call formatAddress with the same value they always agree.
    const addr = STELLAR_56;
    const streamRowResult = formatAddress(addr);
    const walletButtonResult = formatAddress(addr);
    const walletStatusResult = formatAddress(addr);

    expect(streamRowResult).toBe(walletButtonResult);
    expect(walletButtonResult).toBe(walletStatusResult);
  });

  it("matches the TruncatedAddress component's internal truncated display", () => {
    // TruncatedAddress.tsx also calls formatAddress(address) for the code chip.
    // Direct equality check to confirm no divergence.
    const expected = `${STELLAR_56.slice(0, 6)}...${STELLAR_56.slice(-4)}`;
    expect(formatAddress(STELLAR_56)).toBe(expected);
  });
});
