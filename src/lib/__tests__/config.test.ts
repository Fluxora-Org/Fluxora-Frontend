import { describe, expect, it } from "vitest";
import {
  ConfigError,
  createConfig,
  getNetworkLabel,
  getNetworkPassphrase,
  parseBooleanFlag,
} from "../config";

const VALID_STREAM_CONTRACT_ID =
  "CBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4Z";

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
        VITE_STREAM_CONTRACT_ID: VALID_STREAM_CONTRACT_ID,
        VITE_USE_MOCKS: "true",
      }),
    );

    expect(config.apiUrl).toBe("https://api.example.test");
    expect(config.network).toBe("PUBLIC");
    expect(config.networkLabel).toBe("Public Network (Mainnet)");
    expect(config.rpcUrl).toBeNull();
    expect(config.streamContractId).toBe(VALID_STREAM_CONTRACT_ID);
    expect(config.useMocks).toBe(true);
  });

  it("preserves optional unset stream contract IDs", () => {
    expect(createConfig(env()).streamContractId).toBeNull();
    expect(createConfig(env({ VITE_STREAM_CONTRACT_ID: " " })).streamContractId).toBeNull();
  });

  it("rejects malformed stream contract IDs with typed config errors", () => {
    const invalidValues = [
      "GBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4Z",
      "CBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4",
      VALID_STREAM_CONTRACT_ID.toLowerCase(),
      `${VALID_STREAM_CONTRACT_ID.slice(0, -1)}A`,
    ];

    for (const value of invalidValues) {
      expect(() =>
        createConfig(env({ VITE_STREAM_CONTRACT_ID: value })),
      ).toThrow(ConfigError);

      try {
        createConfig(env({ VITE_STREAM_CONTRACT_ID: value }));
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).envName).toBe("VITE_STREAM_CONTRACT_ID");
        expect((error as Error).message).toContain("VITE_STREAM_CONTRACT_ID");
      }
    }
  });

  it("rejects whitespace-padded stream contract IDs", () => {
    expect(() =>
      createConfig(env({ VITE_STREAM_CONTRACT_ID: ` ${VALID_STREAM_CONTRACT_ID}` })),
    ).toThrow("VITE_STREAM_CONTRACT_ID: must not include leading or trailing whitespace.");

    expect(() =>
      createConfig(env({ VITE_STREAM_CONTRACT_ID: `${VALID_STREAM_CONTRACT_ID} ` })),
    ).toThrow("VITE_STREAM_CONTRACT_ID: must not include leading or trailing whitespace.");
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
