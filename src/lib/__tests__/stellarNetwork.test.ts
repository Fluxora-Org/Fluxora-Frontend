import { describe, expect, it, vi, afterEach } from "vitest";
import {
  getExpectedStellarNetwork,
  isStellarNetworkMismatch,
  normalizeStellarNetwork,
} from "../stellarNetwork";

describe("normalizeStellarNetwork", () => {
  it("should normalize supported network names to uppercase, case-insensitively", () => {
    expect(normalizeStellarNetwork("public")).toBe("PUBLIC");
    expect(normalizeStellarNetwork("PUBLIC")).toBe("PUBLIC");
    expect(normalizeStellarNetwork("testnet")).toBe("TESTNET");
    expect(normalizeStellarNetwork("TESTNET")).toBe("TESTNET");
    expect(normalizeStellarNetwork("tEsTnEt")).toBe("TESTNET");
    expect(normalizeStellarNetwork("PuBlIc")).toBe("PUBLIC");
  });

  it("should handle and trim surrounding whitespace", () => {
    expect(normalizeStellarNetwork("  public  ")).toBe("PUBLIC");
    expect(normalizeStellarNetwork("\ntestnet\r\n")).toBe("TESTNET");
    expect(normalizeStellarNetwork("\tPUBLIC\t")).toBe("PUBLIC");
    expect(normalizeStellarNetwork(" TESTNET ")).toBe("TESTNET");
  });

  it("should return null for unsupported stellar network values", () => {
    expect(normalizeStellarNetwork("FUTURENET")).toBeNull();
    expect(normalizeStellarNetwork("futurenet")).toBeNull();
    expect(normalizeStellarNetwork("SANDBOX")).toBeNull();
    expect(normalizeStellarNetwork("random_value")).toBeNull();
  });

  it("should return null for null, undefined, or empty string inputs", () => {
    expect(normalizeStellarNetwork(null)).toBeNull();
    expect(normalizeStellarNetwork(undefined)).toBeNull();
    expect(normalizeStellarNetwork("")).toBeNull();
    expect(normalizeStellarNetwork("   ")).toBeNull();
  });
});

describe("getExpectedStellarNetwork", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return the network for a valid env value passed directly", () => {
    expect(getExpectedStellarNetwork("PUBLIC")).toBe("PUBLIC");
    expect(getExpectedStellarNetwork("TESTNET")).toBe("TESTNET");
  });

  it("should fall back to TESTNET for an unsupported env value passed directly", () => {
    expect(getExpectedStellarNetwork("FUTURENET")).toBe("TESTNET");
    expect(getExpectedStellarNetwork("random")).toBe("TESTNET");
  });

  it("should fall back to TESTNET for a missing env value (null/undefined) passed directly", () => {
    expect(getExpectedStellarNetwork(undefined)).toBe("TESTNET");
    expect(getExpectedStellarNetwork(null as any)).toBe("TESTNET");
  });

  it("should resolve the expected network correctly using stubbed environment variable VITE_NETWORK", () => {
    vi.stubEnv("VITE_NETWORK", "PUBLIC");
    expect(getExpectedStellarNetwork()).toBe("PUBLIC");

    vi.stubEnv("VITE_NETWORK", "TESTNET");
    expect(getExpectedStellarNetwork()).toBe("TESTNET");
  });

  it("should fall back to TESTNET when VITE_NETWORK is unsupported", () => {
    vi.stubEnv("VITE_NETWORK", "FUTURENET");
    expect(getExpectedStellarNetwork()).toBe("TESTNET");

    vi.stubEnv("VITE_NETWORK", "INVALID_ENV_VALUE");
    expect(getExpectedStellarNetwork()).toBe("TESTNET");
  });

  it("should fall back to TESTNET when VITE_NETWORK is missing/empty", () => {
    vi.stubEnv("VITE_NETWORK", "");
    expect(getExpectedStellarNetwork()).toBe("TESTNET");

    // Default when env is not stubbed or undefined
    vi.stubEnv("VITE_NETWORK", undefined as any);
    expect(getExpectedStellarNetwork()).toBe("TESTNET");
  });
});

describe("isStellarNetworkMismatch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return false for matching valid networks", () => {
    expect(isStellarNetworkMismatch("PUBLIC", "PUBLIC")).toBe(false);
    expect(isStellarNetworkMismatch("TESTNET", "TESTNET")).toBe(false);
    // Case/whitespace normalization
    expect(isStellarNetworkMismatch("  public  ", "PUBLIC")).toBe(false);
    expect(isStellarNetworkMismatch("TESTNET", "  testnet  ")).toBe(false);
    expect(isStellarNetworkMismatch("testnet", "TESTNET")).toBe(false);
  });

  it("should return true for mismatched-but-both-valid networks", () => {
    expect(isStellarNetworkMismatch("PUBLIC", "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET", "PUBLIC")).toBe(true);
  });

  it("should report a mismatch (return true) when the connected network is unsupported or missing (fail-closed)", () => {
    expect(isStellarNetworkMismatch("FUTURENET", "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("FUTURENET", "PUBLIC")).toBe(true);
    expect(isStellarNetworkMismatch(undefined, "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch(null, "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("", "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("   ", "TESTNET")).toBe(true);
  });

  it("should report a mismatch (return true) when the expected network is unsupported or missing explicitly", () => {
    expect(isStellarNetworkMismatch("TESTNET", "FUTURENET")).toBe(true);
    expect(isStellarNetworkMismatch("PUBLIC", "FUTURENET")).toBe(true);
    expect(isStellarNetworkMismatch("PUBLIC", null as any)).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET", "")).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET", "   ")).toBe(true);
  });

  it("should use the default expected network when second argument is undefined/omitted", () => {
    // If VITE_NETWORK is unset (defaults to TESTNET)
    vi.stubEnv("VITE_NETWORK", "TESTNET");
    expect(isStellarNetworkMismatch("TESTNET", undefined)).toBe(false);
    expect(isStellarNetworkMismatch("TESTNET")).toBe(false);
    expect(isStellarNetworkMismatch("PUBLIC", undefined)).toBe(true);
    expect(isStellarNetworkMismatch("PUBLIC")).toBe(true);

    // If VITE_NETWORK is stubbed to PUBLIC
    vi.stubEnv("VITE_NETWORK", "PUBLIC");
    expect(isStellarNetworkMismatch("PUBLIC", undefined)).toBe(false);
    expect(isStellarNetworkMismatch("PUBLIC")).toBe(false);
    expect(isStellarNetworkMismatch("TESTNET", undefined)).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET")).toBe(true);
  });
});
