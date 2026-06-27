import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createConfig } from "../config";
import { normalizeStellarNetwork } from "../stellarNetwork";

interface ParsedEnv {
  active: Record<string, string>;
  examples: Record<string, string>;
}

function parseEnvExample(): ParsedEnv {
  const envExamplePath = path.resolve(__dirname, "../../../.env.example");
  const content = fs.readFileSync(envExamplePath, "utf8");

  const active: Record<string, string> = {};
  const examples: Record<string, string> = {};

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim();
        if (key.startsWith("VITE_")) {
          active[key] = val;
        }
      }
    } else {
      const exampleMatch = trimmed.match(
        /#\s*(?:Example|example):\s*(VITE_[A-Z0-9_]+)\s*=\s*(.+)$/,
      );
      if (exampleMatch) {
        const [, key, val] = exampleMatch;
        examples[key] = val.trim();
      }
    }
  }

  return { active, examples };
}

describe("Environment Variables Verification", () => {
  const { active, examples } = parseEnvExample();

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("should document all 10 expected variables in .env.example", () => {
    const expectedVars = [
      "VITE_API_URL",
      "VITE_NETWORK",
      "VITE_RPC_URL",
      "VITE_STREAM_CONTRACT_ID",
      "VITE_USE_MOCKS",
      "VITE_DEMO_MODE",
      "VITE_TX_POLL_INTERVAL_MS",
      "VITE_TX_POLL_MAX_ATTEMPTS",
      "VITE_TX_POLL_BACKOFF_FACTOR",
      "VITE_TX_DEMO_CONFIRMATION_ATTEMPTS",
    ];

    for (const variable of expectedVars) {
      expect(examples).toHaveProperty(variable);
      expect(active).toHaveProperty(variable);
    }
  });

  describe("Example Values Format Validation", () => {
    it("should verify VITE_API_URL example is a valid absolute URL with http/https", () => {
      const url = new URL(examples.VITE_API_URL);
      expect(["http:", "https:"]).toContain(url.protocol);
    });

    it("should verify VITE_RPC_URL example is a valid absolute URL with http/https", () => {
      const url = new URL(examples.VITE_RPC_URL);
      expect(["http:", "https:"]).toContain(url.protocol);
    });

    it("should verify VITE_NETWORK example is a valid Stellar Network", () => {
      const normalized = normalizeStellarNetwork(examples.VITE_NETWORK);
      expect(normalized).not.toBeNull();
      expect(["PUBLIC", "TESTNET"]).toContain(normalized);
    });

    it("should verify VITE_STREAM_CONTRACT_ID example is a valid Stellar Contract ID", () => {
      // Soroban Contract ID: 'C' followed by 55 alphanumeric uppercase characters
      const contractId = examples.VITE_STREAM_CONTRACT_ID;
      expect(contractId).toMatch(/^C[A-Z0-9]{55}$/);
    });

    it("should verify VITE_USE_MOCKS example is boolean-equivalent", () => {
      expect(["true", "false", "1", "0"]).toContain(examples.VITE_USE_MOCKS);
    });

    it("should verify VITE_DEMO_MODE example is boolean-equivalent", () => {
      expect(["true", "false", "1", "0"]).toContain(examples.VITE_DEMO_MODE);
    });

    it("should verify VITE_TX_POLL_INTERVAL_MS example is a positive integer >= 1", () => {
      const num = Number(examples.VITE_TX_POLL_INTERVAL_MS);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
    });

    it("should verify VITE_TX_POLL_MAX_ATTEMPTS example is a positive integer >= 1", () => {
      const num = Number(examples.VITE_TX_POLL_MAX_ATTEMPTS);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
    });

    it("should verify VITE_TX_POLL_BACKOFF_FACTOR example is a positive number >= 1.0", () => {
      const num = Number(examples.VITE_TX_POLL_BACKOFF_FACTOR);
      expect(Number.isNaN(num)).toBe(false);
      expect(num).toBeGreaterThanOrEqual(1.0);
    });

    it("should verify VITE_TX_DEMO_CONFIRMATION_ATTEMPTS example is a positive integer >= 1", () => {
      const num = Number(examples.VITE_TX_DEMO_CONFIRMATION_ATTEMPTS);
      expect(Number.isInteger(num)).toBe(true);
      expect(num).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Application Config Parsing", () => {
    it("should successfully parse config with example values stubbed in the env", async () => {
      // Stub the environment variables with the example values
      vi.stubEnv("VITE_API_URL", examples.VITE_API_URL);
      vi.stubEnv("VITE_NETWORK", examples.VITE_NETWORK);
      vi.stubEnv("VITE_RPC_URL", examples.VITE_RPC_URL);
      vi.stubEnv("VITE_STREAM_CONTRACT_ID", examples.VITE_STREAM_CONTRACT_ID);
      vi.stubEnv("VITE_USE_MOCKS", examples.VITE_USE_MOCKS);
      vi.stubEnv("VITE_DEMO_MODE", examples.VITE_DEMO_MODE);

      const parsedConfig = createConfig(import.meta.env);

      expect(parsedConfig.apiUrl).toBe(examples.VITE_API_URL);
      expect(parsedConfig.network).toBe(examples.VITE_NETWORK);
      expect(parsedConfig.rpcUrl).toBe(examples.VITE_RPC_URL);
      expect(parsedConfig.streamContractId).toBe(
        examples.VITE_STREAM_CONTRACT_ID,
      );
      expect(parsedConfig.useMocks).toBe(examples.VITE_USE_MOCKS === "true");
    });

    it("should successfully parse transaction timing configs with example values stubbed", async () => {
      vi.stubEnv("VITE_TX_POLL_INTERVAL_MS", examples.VITE_TX_POLL_INTERVAL_MS);
      vi.stubEnv(
        "VITE_TX_POLL_MAX_ATTEMPTS",
        examples.VITE_TX_POLL_MAX_ATTEMPTS,
      );
      vi.stubEnv(
        "VITE_TX_POLL_BACKOFF_FACTOR",
        examples.VITE_TX_POLL_BACKOFF_FACTOR,
      );
      vi.stubEnv(
        "VITE_TX_DEMO_CONFIRMATION_ATTEMPTS",
        examples.VITE_TX_DEMO_CONFIRMATION_ATTEMPTS,
      );

      // Dynamically import transactionConfig to test module-level evaluation
      const { transactionPollingConfig } = await import("../transactionConfig");

      expect(transactionPollingConfig.pollIntervalMs).toBe(
        Number(examples.VITE_TX_POLL_INTERVAL_MS),
      );
      expect(transactionPollingConfig.maxAttempts).toBe(
        Number(examples.VITE_TX_POLL_MAX_ATTEMPTS),
      );
      expect(transactionPollingConfig.backoffFactor).toBe(
        Number(examples.VITE_TX_POLL_BACKOFF_FACTOR),
      );
      expect(transactionPollingConfig.demoConfirmationAttempts).toBe(
        Number(examples.VITE_TX_DEMO_CONFIRMATION_ATTEMPTS),
      );
    });

    it("should fallback to defaults when transaction timing configs are invalid", async () => {
      vi.stubEnv("VITE_TX_POLL_INTERVAL_MS", "invalid");
      vi.stubEnv("VITE_TX_POLL_MAX_ATTEMPTS", "-5");
      vi.stubEnv("VITE_TX_POLL_BACKOFF_FACTOR", "0.5"); // Below 1.0
      vi.stubEnv("VITE_TX_DEMO_CONFIRMATION_ATTEMPTS", "abc");

      const { transactionPollingConfig } = await import("../transactionConfig");

      // Verify it fell back to default configurations
      expect(transactionPollingConfig.pollIntervalMs).toBe(750);
      expect(transactionPollingConfig.maxAttempts).toBe(6);
      expect(transactionPollingConfig.backoffFactor).toBe(1.25);
      expect(transactionPollingConfig.demoConfirmationAttempts).toBe(2);
    });
  });
});
