/**
 * Recipient page — loading / empty / retry / edge-case states
 *
 * Covers the explicit state transitions and edge behaviours that are not
 * already exercised by Recipient.test.tsx or Recipient.empty.test.tsx:
 *
 *  1. Initial loading skeleton (page-level 2 s timeout)
 *  2. loading → empty transition when service loading clears with no streams
 *  3. Service error shows error banner inside RecipientEmptyState
 *  4. Error → retry: clicking Retry calls refetch
 *  5. Error state never falls through to demo-balance values
 *  6. Service still loading after page timeout → RecipientEmptyState receives loading=true
 *  7. Zero-accrual banner shown when connected + streams exist + balance === 0
 *  8. Zero-accrual banner absent when balance > 0
 *  9. Network mismatch disables the withdraw button
 * 10. Wallet-address change resets txState / errorMsg
 * 11. Keyboard (Enter / Space) activates the withdraw button
 * 12. Withdraw button has an accessible name
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/toast/ToastProvider";
import Recipient from "../Recipient";

// ── Shared mutable wallet state ───────────────────────────────────────────────

const walletState = {
  address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
  network: "TESTNET",
  connected: true,
  loading: false,
  error: null as string | null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => walletState,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Shared mutable streams state ──────────────────────────────────────────────

const streamsState = {
  streams: [] as {
    id: string;
    status: string;
    withdrawableAmount: number;
    streamedAmount: number;
  }[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};

vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useRecipientStreams: () => streamsState,
}));

vi.mock("../../lib/stellar/tx", () => ({
  withdraw: vi.fn().mockResolvedValue("TX_HASH_123"),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStream(
  overrides: Partial<typeof streamsState.streams[0]> = {},
) {
  return {
    id: "1",
    name: "Test Stream",
    recipientName: "Alice",
    recipientAddress: walletState.address,
    treasuryName: "Treasury",
    treasuryAddress: "GTREASURY",
    asset: "USDC",
    status: "Active",
    monthlyRate: 1000,
    depositAmount: 12000,
    streamedAmount: 5000,
    withdrawableAmount: 3000,
    remainingAmount: 7000,
    progress: 42,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    summary: "",
    health: "Healthy" as const,
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
    ...overrides,
  };
}

function renderRecipient() {
  return render(
    <ToastProvider>
      <Recipient />
    </ToastProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Recipient page — loading state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset to defaults
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the loading skeleton immediately on mount", () => {
    renderRecipient();

    expect(
      screen.getByRole("status", { name: /loading recipient portal/i }),
    ).toBeInTheDocument();
  });

  it("hides the loading skeleton once the 2-second page timeout fires", () => {
    renderRecipient();

    expect(
      screen.getByRole("status", { name: /loading recipient portal/i }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByRole("status", { name: /loading recipient portal/i }),
    ).not.toBeInTheDocument();
  });

  it("renders RecipientEmptyState (not the loaded portal) after timer when there are no streams", () => {
    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();
    // The full portal (hero section) must not be visible
    expect(
      screen.queryByText("Recipient Portal"),
    ).not.toBeInTheDocument();
  });

  it("renders the full portal (hero section) after timer when streams exist", () => {
    streamsState.streams = [makeStream()];

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByRole("region", { name: "Recipient empty state" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Recipient Portal")).toBeInTheDocument();
  });

  it("passes loading=true to RecipientEmptyState while the service fetch is still in flight after the page timeout", () => {
    // Service hasn't resolved yet when the page timer fires
    streamsState.loading = true;
    streamsState.streams = [];

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // RecipientEmptyState with loading=true renders EmptyState's LoadingSkeleton
    // which has role="status" aria-label="Loading content"
    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });
});

describe("Recipient page — service error and retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the error message inside the empty-state region when the service fails", () => {
    streamsState.error = "Unable to load recipient streams.";

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Unable to load recipient streams.");
  });

  it("exposes a Retry button when the service fails", () => {
    streamsState.error = "Service unavailable.";

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("button", { name: /retry loading data/i }),
    ).toBeInTheDocument();
  });

  it("calls refetch when Retry is clicked", () => {
    streamsState.error = "Service unavailable.";

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    fireEvent.click(screen.getByRole("button", { name: /retry loading data/i }));

    expect(streamsState.refetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT fall through to demo-balance values when the service returns an error", () => {
    streamsState.error = "Service unavailable.";

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // The hero section with withdraw button (showing DEMO_BALANCE 22,600 USDC) must not appear
    expect(
      screen.queryByRole("button", { name: /withdraw 22,600 usdc/i }),
    ).not.toBeInTheDocument();
    // The error empty-state must be shown instead
    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();
  });
});

describe("Recipient page — zero-accrual banner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the zero-accrual banner when connected, has active streams, but withdrawable balance is 0", () => {
    streamsState.streams = [
      makeStream({ status: "Active", withdrawableAmount: 0, streamedAmount: 100 }),
    ];

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // ZeroAccrualBanner has role="status" with aria-label matching the pattern
    expect(
      screen.getByRole("status", { name: /zero accrual notice/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show the zero-accrual banner when there is a withdrawable balance", () => {
    streamsState.streams = [
      makeStream({ status: "Active", withdrawableAmount: 500, streamedAmount: 1000 }),
    ];

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByRole("status", { name: /zero accrual notice/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show the zero-accrual banner when not connected", () => {
    walletState.connected = false;
    walletState.address = null as any;
    streamsState.streams = [];

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByRole("status", { name: /zero accrual notice/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Recipient page — network mismatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables the withdraw button when the wallet network does not match the expected network", () => {
    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // The page renders the full portal (wallet is connected and we're using demo data)
    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });
    expect(withdrawButton).toBeDisabled();
  });

  it("shows a network-mismatch error message when the wallet is on the wrong network", () => {
    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent(/wrong network/i);
  });
});

describe("Recipient page — wallet address change resets tx state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resets txState when the wallet address changes", async () => {
    const withdrawMock = await import("../../lib/stellar/tx");
    vi.mocked(withdrawMock.withdraw).mockRejectedValueOnce(new Error("Rejected"));

    const { rerender } = renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Trigger a failed withdrawal
    fireEvent.click(
      screen.getByRole("button", { name: /withdraw 22,600 usdc/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByRole("button", { name: /withdrawal failed/i }),
    ).toBeInTheDocument();

    // Simulate wallet address change
    walletState.address = "GBDIFFERENTADDRESSNEWWALLET2345678ABCDEF";

    rerender(
      <ToastProvider>
        <Recipient />
      </ToastProvider>,
    );

    // txState should have reset — withdraw button shows the normal label
    expect(
      screen.getByRole("button", { name: /withdraw 22,600 usdc/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /withdrawal failed/i }),
    ).not.toBeInTheDocument();
  });
});

describe("Recipient page — withdraw button keyboard activation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;
    streamsState.streams = [];
    streamsState.loading = false;
    streamsState.error = null;
    streamsState.refetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("activates the withdraw button on Enter key press", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const withdrawMock = await import("../../lib/stellar/tx");
    vi.mocked(withdrawMock.withdraw).mockResolvedValue("TX_HASH" as any);

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });

    withdrawButton.focus();
    await user.keyboard("{Enter}");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(withdrawMock.withdraw).toHaveBeenCalled();
  });

  it("activates the withdraw button on Space key press", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const withdrawMock = await import("../../lib/stellar/tx");
    vi.mocked(withdrawMock.withdraw).mockResolvedValue("TX_HASH" as any);

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });

    withdrawButton.focus();
    await user.keyboard(" ");

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(withdrawMock.withdraw).toHaveBeenCalled();
  });

  it("withdraw button has an accessible role and name", () => {
    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });

    expect(withdrawButton).toBeInTheDocument();
    expect(withdrawButton).toHaveAttribute("type", "button");
  });

  it("withdraw button is not focusable in the disabled (disconnected) state", () => {
    walletState.connected = false;
    walletState.address = null as any;

    renderRecipient();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // In disconnected state the page shows RecipientEmptyState — no withdraw button
    expect(
      screen.queryByRole("button", { name: /withdraw/i }),
    ).not.toBeInTheDocument();
  });
});
