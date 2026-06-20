import { describe, expect, it } from "vitest";
import {
  createConfig,
  getNetworkLabel,
  getNetworkPassphrase,
  parseBooleanFlag,
} from "../config";

function env(overrides: Partial<ImportMetaEnv> = {}): ImportMetaEnv {
  return overrides as ImportMetaEnv;
}

describe("config", () => {
  it("defaults to TESTNET and exposes the testnet passphrase", () => {
    const config = createConfig(env());

    expect(config.network).toBe("TESTNET");
    expect(config.networkLabel).toBe("Testnet");
    expect(config.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("reads public env values without coercing empty strings into values", () => {
    const config = createConfig(
      env({
        VITE_API_URL: "https://api.example.test",
        VITE_NETWORK: "PUBLIC",
        VITE_RPC_URL: " ",
        VITE_STREAM_CONTRACT_ID: "CCONTRACT",
        VITE_USE_MOCKS: "true",
      }),
    );

    expect(config.apiUrl).toBe("https://api.example.test");
    expect(config.network).toBe("PUBLIC");
    expect(config.networkLabel).toBe("Public Network (Mainnet)");
    expect(config.rpcUrl).toBeNull();
    expect(config.streamContractId).toBe("CCONTRACT");
    expect(config.useMocks).toBe(true);
  });

  it("fails closed to TESTNET for unsupported networks", () => {
    const config = createConfig(env({ VITE_NETWORK: "futurenet" }));

    expect(config.network).toBe("TESTNET");
    expect(config.networkLabel).toBe("Testnet");
  });

  it("normalizes labels, passphrases, and boolean flags", () => {
    expect(getNetworkLabel("PUBLIC")).toBe("Public Network (Mainnet)");
    expect(getNetworkPassphrase("PUBLIC")).toBe(
      "Public Global Stellar Network ; September 2015",
    );
    expect(parseBooleanFlag("1")).toBe(true);
    expect(parseBooleanFlag("false")).toBe(false);
  });
});
