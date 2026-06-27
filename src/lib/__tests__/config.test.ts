import { describe, expect, it } from "vitest";
import {
  createConfig,
  getNetworkLabel,
  getNetworkPassphrase,
  parseBooleanFlag,
  validateUrl,
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

describe("validateUrl", () => {
  it("accepts https URLs", () => {
    expect(validateUrl("apiUrl", "https://api.example.com")).toBe(
      "https://api.example.com",
    );
  });

  it("accepts https URLs with paths and query strings", () => {
    expect(
      validateUrl("rpcUrl", "https://rpc.example.com/v1?key=abc"),
    ).toBe("https://rpc.example.com/v1?key=abc");
  });

  it("accepts http://localhost", () => {
    expect(validateUrl("rpcUrl", "http://localhost:8000")).toBe(
      "http://localhost:8000",
    );
  });

  it("accepts http://127.0.0.1", () => {
    expect(validateUrl("apiUrl", "http://127.0.0.1:3000/api")).toBe(
      "http://127.0.0.1:3000/api",
    );
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateUrl("apiUrl", "  https://api.example.com  ")).toBe(
      "https://api.example.com",
    );
  });

  it("rejects a plain non-URL string", () => {
    const result = validateUrl("apiUrl", "not-a-url");
    expect(result).toMatchObject({
      field: "apiUrl",
      message: expect.stringContaining("not a valid URL"),
    });
  });

  it("rejects an empty-looking string (spaces only via trim)", () => {
    const result = validateUrl("apiUrl", "   ");
    expect(result).toMatchObject({ field: "apiUrl" });
  });

  it("rejects ftp:// protocol", () => {
    const result = validateUrl("rpcUrl", "ftp://files.example.com");
    expect(result).toMatchObject({
      field: "rpcUrl",
      message: expect.stringContaining("ftp:"),
    });
  });

  it("rejects javascript: protocol", () => {
    const result = validateUrl("apiUrl", "javascript:alert(1)");
    expect(result).toMatchObject({
      field: "apiUrl",
      message: expect.stringContaining("javascript:"),
    });
  });

  it("rejects data: protocol", () => {
    const result = validateUrl("rpcUrl", "data:text/html,<h1>hi</h1>");
    expect(result).toMatchObject({
      field: "rpcUrl",
      message: expect.stringContaining("data:"),
    });
  });

  it("rejects http:// for non-local hosts", () => {
    const result = validateUrl("apiUrl", "http://api.example.com");
    expect(result).toMatchObject({
      field: "apiUrl",
      message: expect.stringContaining("http:"),
    });
  });

  it("includes the field name in the error message", () => {
    const result = validateUrl("rpcUrl", "garbage");
    expect(result).toMatchObject({
      field: "rpcUrl",
      message: expect.stringContaining("rpcUrl"),
    });
  });
});

describe("createConfig URL validation", () => {
  it("leaves apiUrl and rpcUrl null when unset", () => {
    const config = createConfig(env());
    expect(config.apiUrl).toBeNull();
    expect(config.rpcUrl).toBeNull();
  });

  it("throws for a malformed apiUrl", () => {
    expect(() =>
      createConfig(env({ VITE_API_URL: "not-a-url" })),
    ).toThrow(/apiUrl/);
  });

  it("throws for a malformed rpcUrl", () => {
    expect(() =>
      createConfig(env({ VITE_RPC_URL: "garbage" })),
    ).toThrow(/rpcUrl/);
  });

  it("throws for a disallowed protocol on apiUrl", () => {
    expect(() =>
      createConfig(env({ VITE_API_URL: "ftp://files.example.com" })),
    ).toThrow(/apiUrl/);
  });

  it("throws for http:// rpcUrl on a non-local host", () => {
    expect(() =>
      createConfig(env({ VITE_RPC_URL: "http://rpc.example.com" })),
    ).toThrow(/rpcUrl/);
  });

  it("throws for javascript: injection in apiUrl", () => {
    expect(() =>
      createConfig(env({ VITE_API_URL: "javascript:alert(1)" })),
    ).toThrow(/apiUrl/);
  });

  it("accumulates errors from both fields in one throw", () => {
    expect(() =>
      createConfig(
        env({ VITE_API_URL: "bad-api", VITE_RPC_URL: "bad-rpc" }),
      ),
    ).toThrow(/apiUrl.*rpcUrl|rpcUrl.*apiUrl/);
  });

  it("accepts https apiUrl and rpcUrl", () => {
    const config = createConfig(
      env({
        VITE_API_URL: "https://api.example.com",
        VITE_RPC_URL: "https://rpc.example.com",
      }),
    );
    expect(config.apiUrl).toBe("https://api.example.com");
    expect(config.rpcUrl).toBe("https://rpc.example.com");
  });

  it("accepts http localhost for rpcUrl", () => {
    const config = createConfig(
      env({ VITE_RPC_URL: "http://localhost:8000" }),
    );
    expect(config.rpcUrl).toBe("http://localhost:8000");
  });
});
