const STELLAR_ADDRESS_REGEX = /^G[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55}$/;
const STRKEY_BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3;
const ED25519_PUBLIC_KEY_BYTE_LENGTH = 35;

function decodeBase32(value: string): Uint8Array | null {
  let bits = 0;
  let bitCount = 0;
  const bytes: number[] = [];

  for (const char of value) {
    const index = STRKEY_BASE32_ALPHABET.indexOf(char);
    if (index === -1) return null;

    bits = (bits << 5) | index;
    bitCount += 5;

    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((bits >> bitCount) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

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

/**
 * Validates a Stellar StrKey ed25519 public key.
 *
 * A standard account address is 56 base32 characters, starts with G, decodes
 * to version byte 0x30 plus a 32-byte public key, and ends with a little-endian
 * CRC16-XModem checksum over the version byte and payload.
 */
export function isValidStellarAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!STELLAR_ADDRESS_REGEX.test(trimmed)) return false;

  const decoded = decodeBase32(trimmed);
  if (!decoded || decoded.length !== ED25519_PUBLIC_KEY_BYTE_LENGTH) {
    return false;
  }

  if (decoded[0] !== ED25519_PUBLIC_KEY_VERSION_BYTE) return false;

  const payload = decoded.slice(0, decoded.length - 2);
  const checksum = decoded[decoded.length - 2] | (decoded[decoded.length - 1] << 8);

  return crc16XModem(payload) === checksum;
}

/**
 * Masks long Stellar-like identifiers while preserving enough edge characters
 * for recognition in compact UI.
 */
export function maskAddress(value: string, prefix = 8, suffix = 4): string {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= prefix + suffix) return trimmed;
  return `${trimmed.slice(0, prefix)}...${trimmed.slice(-suffix)}`;
}

export function stellarExplorerUrl(address: string, network?: string | null) {
  const normalizedNetwork = network?.toUpperCase();
  const explorerNetwork =
    normalizedNetwork === "PUBLIC" || normalizedNetwork === "MAINNET"
      ? "public"
      : "testnet";

  return `https://stellar.expert/explorer/${explorerNetwork}/account/${encodeURIComponent(
    address,
  )}`;
}
