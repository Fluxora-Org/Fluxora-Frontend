// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

describe("transactionConfig", () => {
  it("defaults to 100 stroops base fee if VITE_TX_BASE_FEE is unset", async () => {
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(100);
  });

  it("reads positive integer base fee from env", async () => {
    vi.stubEnv("VITE_TX_BASE_FEE", "250");
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(250);
  });

  it("handles decimal numbers by flooring them", async () => {
    vi.stubEnv("VITE_TX_BASE_FEE", "150.75");
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(150);
  });

  it("falls back to default 100 if VITE_TX_BASE_FEE is invalid", async () => {
    vi.stubEnv("VITE_TX_BASE_FEE", "invalid-number");
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(100);
  });

  it("allows base fee to be 0 for zero-fee environments", async () => {
    vi.stubEnv("VITE_TX_BASE_FEE", "0");
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(0);
  });

  it("falls back to default 100 if VITE_TX_BASE_FEE is negative", async () => {
    vi.stubEnv("VITE_TX_BASE_FEE", "-50");
    vi.resetModules();
    const { transactionConfig } = await import("../transactionConfig");
    expect(transactionConfig.baseFee).toBe(100);
  });
});
