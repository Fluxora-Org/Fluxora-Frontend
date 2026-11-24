import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WalletProviderError } from "../walletProvider";

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighter);

import { createFreighterProvider } from "../freighterProvider";

const APPROVED_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

async function captureError(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (error) {
    return error as WalletProviderError;
  }
}

describe("freighterProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freighter.getNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
  });

  it("connects with the approved address and network", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({ address: APPROVED_ADDRESS });

    await expect(createFreighterProvider().connect()).resolves.toEqual({
      address: APPROVED_ADDRESS,
      network: "TESTNET",
    });
  });

  it("maps a missing extension to not_installed", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });

    const error = await captureError(createFreighterProvider().connect());
    expect(error?.type).toBe("not_installed");
    expect(freighter.requestAccess).not.toHaveBeenCalled();
  });

  it("maps a declined requestAccess to rejected", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({
      address: "",
      error: { code: -4, message: "User declined access" },
    });

    const error = await captureError(createFreighterProvider().connect());
    expect(error?.type).toBe("rejected");
  });

  it("returns null for a silent restore when the extension is unavailable", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });

    await expect(createFreighterProvider().restore()).resolves.toBeNull();
    expect(freighter.getAddress).not.toHaveBeenCalled();
  });

  it("classifies an empty restore address as a rejection", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: "" });

    const error = await captureError(createFreighterProvider().restore());
    expect(error?.type).toBe("rejected");
  });

  it("restores an approved session", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.getAddress.mockResolvedValue({ address: APPROVED_ADDRESS });

    await expect(createFreighterProvider().restore()).resolves.toEqual({
      address: APPROVED_ADDRESS,
      network: "TESTNET",
    });
  });

  it("signs an XDR envelope with the requested network passphrase", async () => {
    freighter.signTransaction.mockResolvedValue({ signedTxXdr: "signed-xdr" });

    await expect(
      createFreighterProvider().signTransaction("unsigned-xdr", {
        networkPassphrase: "Test SDF Network ; September 2015",
        address: APPROVED_ADDRESS,
      }),
    ).resolves.toBe("signed-xdr");

    expect(freighter.signTransaction).toHaveBeenCalledWith("unsigned-xdr", {
      networkPassphrase: "Test SDF Network ; September 2015",
      address: APPROVED_ADDRESS,
    });
  });

  it("maps a signing rejection returned in the result envelope", async () => {
    freighter.signTransaction.mockResolvedValue({
      error: { code: -4, message: "User declined" },
    });

    const error = await captureError(
      createFreighterProvider().signTransaction("unsigned-xdr", {
        networkPassphrase: "Test SDF Network ; September 2015",
      }),
    );
    expect(error?.type).toBe("rejected");
  });
});
