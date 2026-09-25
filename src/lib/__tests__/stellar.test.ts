import { describe, expect, it } from "vitest";
import { decodeBase32, isValidStellarAddress, maskAddress, stellarExplorerUrl } from "../stellar";

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

describe("decodeBase32 — non-canonical (non-zero trailing padding bits)", () => {
  // A 7-character base32 string encodes 7 × 5 = 35 bits, which yields
  // 4 full bytes (32 bits) with 3 leftover padding bits.  Per RFC 4648 §3.5
  // and the Stellar StrKey spec those padding bits MUST be zero.  If they
  // are non-zero, multiple distinct base32 strings would decode to the same
  // 4-byte payload — a non-canonical re-encoding.
  //
  // "AAAAAAA"  → index sequence [0,0,0,0,0,0,0] → 35 zero bits
  //             → 4 bytes [0,0,0,0], trailing 3 bits = 0b000 (canonical ✓)
  // "AAAAAAB"  → last index = 1 → trailing 3 bits = 0b001 (non-zero  ✗)
  // "AAAAAAC"  → last index = 2 → trailing 3 bits = 0b010 (non-zero  ✗)
  //
  // Both "AAAAAAB" and "AAAAAAC" decode to the same 4 bytes as "AAAAAAA",
  // which is exactly the non-canonical collision that must be rejected.

  it("accepts a canonical encoding whose trailing padding bits are zero", () => {
    const result = decodeBase32("AAAAAAA");
    expect(result).not.toBeNull();
    expect(Array.from(result!)).toEqual([0, 0, 0, 0]);
  });

  it("rejects a non-canonical encoding with non-zero trailing padding bits (last char B)", () => {
    // "AAAAAAB" has trailing 3 bits = 0b001 — same 4-byte payload as "AAAAAAA"
    expect(decodeBase32("AAAAAAB")).toBeNull();
  });

  it("rejects a non-canonical encoding with non-zero trailing padding bits (last char C)", () => {
    // "AAAAAAC" has trailing 3 bits = 0b010 — same 4-byte payload as "AAAAAAA"
    expect(decodeBase32("AAAAAAC")).toBeNull();
  });

  it("confirms the canonical and non-canonical strings would otherwise share a byte payload", () => {
    // Temporarily decode without the trailing-bit check to show both strings
    // map to identical bytes, proving we are testing a real non-canonical pair.
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    function decodeIgnoringPadding(value: string): number[] {
      let bits = 0;
      let bitCount = 0;
      const bytes: number[] = [];
      for (const char of value) {
        const index = ALPHABET.indexOf(char);
        bits = (bits << 5) | index;
        bitCount += 5;
        while (bitCount >= 8) {
          bitCount -= 8;
          bytes.push((bits >> bitCount) & 0xff);
        }
      }
      return bytes;
    }

    expect(decodeIgnoringPadding("AAAAAAA")).toEqual([0, 0, 0, 0]);
    expect(decodeIgnoringPadding("AAAAAAB")).toEqual([0, 0, 0, 0]);
    expect(decodeIgnoringPadding("AAAAAAC")).toEqual([0, 0, 0, 0]);
  });

  it("still accepts all valid 56-character Stellar addresses (zero remainder for 56×5=280 bits)", () => {
    // 56 chars × 5 bits = 280 bits = 35 bytes exactly; bitCount is always 0
    // at end, so the padding check is a no-op and valid addresses keep passing.
    const address = createValidAddress(277);
    expect(isValidStellarAddress(address)).toBe(true);
    // A different seed produces a different valid address — both should pass.
    expect(isValidStellarAddress(createValidAddress(42))).toBe(true);
  });
});
