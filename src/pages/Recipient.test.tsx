import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const recipientStreamsState = vi.hoisted(() => ({
  streams: [] as Array<{
    id: string;
    status: "Active" | "Paused" | "Completed";
    withdrawableAmount: number;
    streamedAmount: number;
    isPinned?: boolean;
  }>,
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

vi.mock("../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    metrics: [],
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecipientStreams: () => ({
    streams: recipientStreamsState.streams,
    loading: false,
    error: null,
    refetch: vi.fn(),
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
    recipientStreamsState.streams = [];
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

  it("withdraws using the selected live recipient stream id", async () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [
      {
        id: "2",
        status: "Active",
        withdrawableAmount: 4200,
        streamedAmount: 5000,
      },
    ];

    renderRecipient();

    fireEvent.click(screen.getByRole("button", { name: /Withdraw 4,200 USDC/i }));

    await act(async () => {});

    expect(withdrawMock).toHaveBeenCalledWith(
      walletState.address,
      "2",
      "42000000000",
    );
  });

  it("selects only active withdrawable streams with valid contract ids", () => {
    expect(
      selectWithdrawStream([
        { id: "STR-1", status: "Active", withdrawableAmount: 100 },
        { id: "7", status: "Paused", withdrawableAmount: 100 },
        { id: "8", status: "Active", withdrawableAmount: 0 },
        { id: "9", status: "Active", withdrawableAmount: 100 },
      ])?.id,
    ).toBe("9");
    expect(selectWithdrawStream([])).toBeNull();
    expect(isValidWithdrawStreamId("0")).toBe(false);
  });

  it("validates withdraw amounts before contract calls", () => {
    expect(getWithdrawAmount(22_600)).toBe("226000000000");
    expect(getWithdrawAmount(0)).toBeNull();
    expect(getWithdrawAmount(Number.NaN)).toBeNull();
  });
});
