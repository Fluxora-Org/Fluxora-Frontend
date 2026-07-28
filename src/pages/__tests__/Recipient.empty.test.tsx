import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/toast/ToastProvider";

const ADDRESS = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

const mockWalletState = {
  address: ADDRESS,
  network: "TESTNET",
  connected: true,
  loading: false,
  error: null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => mockWalletState,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRefetch = vi.fn();

const pausedStream = {
  id: "1",
  name: "Paused Stream",
  recipientName: "Test Recipient",
  recipientAddress: ADDRESS,
  treasuryName: "Test Treasury",
  treasuryAddress: ADDRESS,
  asset: "USDC",
  status: "Paused",
  monthlyRate: 0,
  depositAmount: 1000,
  streamedAmount: 0,
  withdrawableAmount: 0,
  remainingAmount: 1000,
  progress: 0,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  summary: "A paused stream",
  health: "Attention" as const,
  healthNote: "",
  auditNote: "",
  tags: [],
  timeline: [],
};

const mockRecipientStreams = {
  streams: [pausedStream],
  loading: false,
  error: null,
  refetch: mockRefetch,
};

vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useRecipientStreams: () => mockRecipientStreams,
  useTreasury: vi.fn(),
}));

import Recipient from "../Recipient";

describe("Recipient page — zero incoming streams for a connected wallet", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockWalletState.connected = true;
    mockRecipientStreams.streams = [pausedStream];
    mockRecipientStreams.loading = false;
    mockRecipientStreams.error = null;
    mockRefetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("renders RecipientEmptyState with View docs CTA when a connected wallet has zero active incoming streams", async () => {
    render(
      <ToastProvider>
        <Recipient />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("region", { name: "Recipient empty state" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /no active streams/i })
    ).toBeInTheDocument();

    const ctaButton = screen.getByRole("button", { name: /view docs/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).not.toBeDisabled();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("transitions from loading skeleton to RecipientEmptyState when a connected wallet has zero active incoming streams", async () => {
    render(
      <ToastProvider>
        <Recipient />
      </ToastProvider>
    );

    expect(
      screen.getByRole("status", { name: /loading recipient portal/i })
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByRole("status", { name: /loading recipient portal/i })
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("region", { name: "Recipient empty state" })
    ).toBeInTheDocument();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
