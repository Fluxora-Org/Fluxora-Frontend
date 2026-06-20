import { describe, expect, it } from "vitest";
import { isValidStellarAddress, maskAddress, stellarExplorerUrl } from "../stellar";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3;

function crc16XModem(bytes: Uint8Array): number {
  let crc = 0x0000;

  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) {
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc;
}

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let bitCount = 0;
  let encoded = "";

  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;

    while (bitCount >= 5) {
      bitCount -= 5;
      encoded += BASE32_ALPHABET[(bits >> bitCount) & 31];
    }
  }

  if (bitCount > 0) {
    encoded += BASE32_ALPHABET[(bits << (5 - bitCount)) & 31];
  }

  return encoded;
}

function createValidAddress(seed: number): string {
  const payload = new Uint8Array(33);
  payload[0] = ED25519_PUBLIC_KEY_VERSION_BYTE;

  for (let i = 1; i < payload.length; i += 1) {
    payload[i] = (seed + i * 17) & 0xff;
  }

  const checksum = crc16XModem(payload);
  const bytes = new Uint8Array(35);
  bytes.set(payload, 0);
  bytes[33] = checksum & 0xff;
  bytes[34] = checksum >> 8;

  return encodeBase32(bytes);
}

const VALID_STELLAR_ADDRESS = createValidAddress(277);
const checksumInvalidAddress = `${VALID_STELLAR_ADDRESS.slice(0, -1)}${
  VALID_STELLAR_ADDRESS[VALID_STELLAR_ADDRESS.length - 1] === "A" ? "B" : "A"
}`;

describe("Stellar address helpers", () => {
  it("accepts a checksum-valid standard G address", () => {
    expect(VALID_STELLAR_ADDRESS).toHaveLength(56);
    expect(VALID_STELLAR_ADDRESS.startsWith("G")).toBe(true);
    expect(isValidStellarAddress(VALID_STELLAR_ADDRESS)).toBe(true);
  });

  it("rejects checksum-invalid addresses that still look like G public keys", () => {
    expect(checksumInvalidAddress).toMatch(/^G[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55}$/);
    expect(isValidStellarAddress(checksumInvalidAddress)).toBe(false);
  });

  it("rejects wrong length, lowercase, ambiguous characters, and muxed addresses", () => {
    expect(isValidStellarAddress(VALID_STELLAR_ADDRESS.slice(0, -1))).toBe(false);
    expect(isValidStellarAddress(VALID_STELLAR_ADDRESS.toLowerCase())).toBe(false);
    expect(isValidStellarAddress(`G${"0".repeat(55)}`)).toBe(false);
    expect(isValidStellarAddress(`M${VALID_STELLAR_ADDRESS.slice(1)}`)).toBe(false);
  });

  it("masks addresses consistently for compact UI", () => {
    expect(maskAddress(VALID_STELLAR_ADDRESS)).toBe(
      `${VALID_STELLAR_ADDRESS.slice(0, 8)}...${VALID_STELLAR_ADDRESS.slice(-4)}`,
    );
    expect(maskAddress("  GSHORT  ")).toBe("GSHORT");
    expect(maskAddress("")).toBe("-");
  });
});

describe("stellarExplorerUrl", () => {
  it.each([
    ["PUBLIC", "public"],
    ["MAINNET", "public"],
    ["TESTNET", "testnet"],
    [null, "testnet"],
  ])("maps %s to the %s explorer path", (network, expectedPath) => {
    expect(stellarExplorerUrl("GABC", network)).toBe(
      `https://stellar.expert/explorer/${expectedPath}/account/GABC`,
    );
  });

  it("encodes the account path segment", () => {
    expect(stellarExplorerUrl("GABC/unsafe value", "PUBLIC")).toBe(
      "https://stellar.expert/explorer/public/account/GABC%2Funsafe%20value",
    );
  });
});
