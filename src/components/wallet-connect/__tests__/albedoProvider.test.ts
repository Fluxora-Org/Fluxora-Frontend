import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WalletProviderError,
  type WalletProviderErrorType,
} from "../walletProvider";

const albedo = vi.hoisted(() => ({
  publicKey: vi.fn(),
  tx: vi.fn(),
  forgetImplicitSession: vi.fn(),
}));

vi.mock("@albedo-link/intent", () => ({ default: albedo }));

vi.mock("../../../lib/stellarNetwork", () => ({
  getExpectedStellarNetwork: () => "TESTNET",
  isStellarNetworkMismatch: (
    actual: string | null,
    expected: string,
  ) => (actual ?? "").toUpperCase() !== expected.toUpperCase(),
}));

import { createAlbedoProvider } from "../albedoProvider";

const APPROVED_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

/** Rejects with a typed wallet error; resolves `null` if nothing was thrown. */
async function captureError(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error as WalletProviderError;
  }
}

function expectErrorType(
  error: WalletProviderError | null,
  type: WalletProviderErrorType,
) {
  expect(error).toBeInstanceOf(WalletProviderError);
  expect(error?.type).toBe(type);
}

describe("albedoProvider", () => {
  let originalOpen: typeof window.open;

  beforeEach(() => {
    vi.clearAllMocks();
    originalOpen = window.open;
  });

  afterEach(() => {
    window.open = originalOpen;
    vi.useRealTimers();
  });

  it("connects and reports the configured network", async () => {
    albedo.publicKey.mockResolvedValue({ pubkey: APPROVED_ADDRESS });

    const provider = createAlbedoProvider();
    await expect(provider.connect()).resolves.toEqual({
      address: APPROVED_ADDRESS,
      network: "TESTNET",
    });
    expect(albedo.publicKey).toHaveBeenCalledWith({});
  });

  it("rejects an invalid public key returned by Albedo", async () => {
    albedo.publicKey.mockResolvedValue({ pubkey: "not-an-address" });

    const error = await captureError(createAlbedoProvider().connect());
    expectErrorType(error, "unknown");
  });

  it("maps a browser-blocked popup to a distinct popup_blocked error", async () => {
    // window.open returns null when the browser blocks the popup; the SDK
    // promise then never settles, so the adapter must fail fast.
    window.open = vi.fn(() => null) as unknown as typeof window.open;
    albedo.publicKey.mockImplementation(() => {
      window.open("https://albedo.link/confirm");
      return new Promise(() => {});
    });

    const error = await captureError(createAlbedoProvider().connect());
    expectErrorType(error, "popup_blocked");
  });

  it("maps a user-closed popup to a rejected error", async () => {
    vi.useFakeTimers();
    const popup = { closed: false } as Window;
    window.open = vi.fn(() => popup) as unknown as typeof window.open;
    albedo.publicKey.mockImplementation(() => {
      window.open("https://albedo.link/confirm");
      return new Promise(() => {});
    });

    const provider = createAlbedoProvider({ timeoutMs: 60_000 });
    const settled = captureError(provider.connect());

    await vi.advanceTimersByTimeAsync(400);
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(400);

    expectErrorType(await settled, "rejected");
  });

  it("maps a popup that never answers to a timeout error", async () => {
    vi.useFakeTimers();
    albedo.publicKey.mockImplementation(() => new Promise(() => {}));

    const provider = createAlbedoProvider({ timeoutMs: 5_000 });
    const settled = captureError(provider.connect());
    await vi.advanceTimersByTimeAsync(5_100);

    expectErrorType(await settled, "timeout");
  });

  it("restores silently and returns null when there is no existing session", async () => {
    albedo.publicKey.mockRejectedValue({
      code: -4,
      message: "Action request was rejected by the user.",
    });

    const provider = createAlbedoProvider();
    await expect(provider.restore()).resolves.toBeNull();
    expect(albedo.publicKey).toHaveBeenCalledWith({ require_existing: true });
  });

  it("signs a transaction and returns the signed envelope XDR", async () => {
    albedo.tx.mockResolvedValue({
      xdr: "unsigned-xdr",
      signed_envelope_xdr: "signed-xdr",
      pubkey: APPROVED_ADDRESS,
      network: "testnet",
      tx_hash: "hash",
    });

    const provider = createAlbedoProvider();
    await expect(
      provider.signTransaction("unsigned-xdr", {
        networkPassphrase: "Test SDF Network ; September 2015",
        address: APPROVED_ADDRESS,
      }),
    ).resolves.toBe("signed-xdr");

    expect(albedo.tx).toHaveBeenCalledWith({
      xdr: "unsigned-xdr",
      pubkey: APPROVED_ADDRESS,
      network: "Test SDF Network ; September 2015",
      submit: false,
    });
  });

  it("maps a rejected signing request to a rejected error", async () => {
    albedo.tx.mockRejectedValue({
      code: -4,
      message: "Action request was rejected by the user.",
    });

    const error = await captureError(
      createAlbedoProvider().signTransaction("unsigned-xdr", {
        networkPassphrase: "Test SDF Network ; September 2015",
      }),
    );
    expectErrorType(error, "rejected");
  });

  it("clears the cached account and implicit session on disconnect", async () => {
    albedo.publicKey.mockResolvedValue({ pubkey: APPROVED_ADDRESS });

    const provider = createAlbedoProvider();
    await provider.connect();
    await expect(provider.getAddress()).resolves.toBe(APPROVED_ADDRESS);

    await provider.disconnect();
    expect(albedo.forgetImplicitSession).toHaveBeenCalledWith(APPROVED_ADDRESS);

    // A later getAddress must ask Albedo again instead of reusing the cache.
    albedo.publicKey.mockResolvedValue({ pubkey: APPROVED_ADDRESS });
    await provider.getAddress();
    expect(albedo.publicKey).toHaveBeenCalledTimes(2);
  });
});
