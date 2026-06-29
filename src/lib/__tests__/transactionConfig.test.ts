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

  // ── confirmationMaxRetries ───────────────────────────────────────────────

  describe("confirmationMaxRetries", () => {
    it("defaults to 15 when VITE_TX_CONFIRMATION_MAX_RETRIES is unset", async () => {
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(15);
    });

    it("reads a valid positive integer from env", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "30");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(30);
    });

    it("floors decimal values", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "20.9");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(20);
    });

    it("clamps to minimum of 1 when 0 is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "0");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(1);
    });

    it("clamps to minimum of 1 when a negative value is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "-10");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(1);
    });

    it("clamps to maximum of 300 when an excessively large value is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "9999");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(300);
    });

    it("accepts the boundary value of 300", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "300");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(300);
    });

    it("accepts the boundary value of 1", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "1");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(1);
    });

    it("falls back to default 15 for a non-numeric string", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_MAX_RETRIES", "not-a-number");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationMaxRetries).toBe(15);
    });
  });

  // ── confirmationDelayMs ──────────────────────────────────────────────────

  describe("confirmationDelayMs", () => {
    it("defaults to 1500 ms when VITE_TX_CONFIRMATION_DELAY_MS is unset", async () => {
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(1500);
    });

    it("reads a valid positive integer from env", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "3000");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(3000);
    });

    it("floors decimal values", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "1200.8");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(1200);
    });

    it("clamps to minimum of 100 when a value below the floor is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "50");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(100);
    });

    it("clamps to minimum of 100 when 0 is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "0");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(100);
    });

    it("clamps to minimum of 100 when a negative value is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "-500");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(100);
    });

    it("clamps to maximum of 30000 when an excessively large value is provided", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "999999");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(30000);
    });

    it("accepts the boundary value of 30000", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "30000");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(30000);
    });

    it("accepts the boundary value of 100", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "100");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(100);
    });

    it("falls back to default 1500 for a non-numeric string", async () => {
      vi.stubEnv("VITE_TX_CONFIRMATION_DELAY_MS", "bad-value");
      vi.resetModules();
      const { transactionConfig } = await import("../transactionConfig");
      expect(transactionConfig.confirmationDelayMs).toBe(1500);
    });
  });
});
