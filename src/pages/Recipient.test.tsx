import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockRecipientStreams, type RecipientStream } from "../fixtures/recipientStreams";
import Recipient, {
  getWithdrawAmount,
  isValidWithdrawStreamId,
  selectWithdrawStream,
} from "./Recipient";

const walletState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  network: null as string | null,
}));

const withdrawMock = vi.hoisted(() => vi.fn());

vi.mock("../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    loading: false,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../lib/stellar/tx", () => ({
  withdraw: withdrawMock,
}));

function renderRecipient() {
  render(<Recipient />);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
}

describe("Recipient wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    withdrawMock.mockReset();
    withdrawMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses disconnected state from useWallet for the empty state", () => {
    renderRecipient();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).not.toBeInTheDocument();
  });

  it("enables the withdraw surface when useWallet reports a connected wallet", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    // Match the expected network so the on-chain mismatch guard does not
    // disable the withdraw action.
    walletState.network = "TESTNET";

    renderRecipient();

    expect(
      screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });

  it("withdraws using the selected stream id from recipient stream data", async () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";

    renderRecipient();

    fireEvent.click(screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }));

    await act(async () => {});

    expect(withdrawMock).toHaveBeenCalledWith(
      walletState.address,
      selectWithdrawStream(mockRecipientStreams)?.id,
      "226000000000",
    );
  });

  it("selects a pinned active stream from multiple valid streams", () => {
    const [baseStream] = mockRecipientStreams;
    const streams: RecipientStream[] = [
      { ...baseStream, id: "202", isPinned: false },
      { ...baseStream, id: "303", isPinned: true },
    ];

    expect(selectWithdrawStream(streams)?.id).toBe("303");
  });

  it("does not select a stream when no valid stream id is available", () => {
    const [baseStream] = mockRecipientStreams;

    expect(selectWithdrawStream([])).toBeNull();
    expect(selectWithdrawStream([{ ...baseStream, id: "stream-one" }])).toBeNull();
    expect(isValidWithdrawStreamId("0")).toBe(false);
  });

  it("validates withdraw amount before a contract call", () => {
    expect(getWithdrawAmount(22_600)).toBe("226000000000");
    expect(getWithdrawAmount(0)).toBeNull();
    expect(getWithdrawAmount(Number.NaN)).toBeNull();
  });
});
