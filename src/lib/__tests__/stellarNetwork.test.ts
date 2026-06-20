import { describe, expect, it } from "vitest";
import {
  getExpectedStellarNetwork,
  isStellarNetworkMismatch,
  normalizeStellarNetwork,
} from "../stellarNetwork";

describe("stellar network helpers", () => {
  it("normalizes supported Freighter network names", () => {
    expect(normalizeStellarNetwork(" public ")).toBe("PUBLIC");
    expect(normalizeStellarNetwork("testnet")).toBe("TESTNET");
  });

  it("falls back to TESTNET when VITE_NETWORK is missing or unsupported", () => {
    expect(getExpectedStellarNetwork(undefined)).toBe("TESTNET");
    expect(getExpectedStellarNetwork("FUTURENET")).toBe("TESTNET");
  });

  it("fails safe for unknown connected networks and detects mismatches", () => {
    expect(isStellarNetworkMismatch(undefined, "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("FUTURENET", "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET", "FUTURENET")).toBe(true);
    expect(isStellarNetworkMismatch("PUBLIC", "TESTNET")).toBe(true);
    expect(isStellarNetworkMismatch("TESTNET", "TESTNET")).toBe(false);
  });
});
