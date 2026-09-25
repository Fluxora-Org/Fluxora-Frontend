import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeMonthlySummary } from "../utils/monthlySummary";
import type { StreamRecord } from "../data/streamRecords";
import Recipient, {
  getWithdrawAmount,
  isValidWithdrawStreamId,
  selectWithdrawStream,
} from "./Recipient";
import { getRecipientRouteKey } from "./recipientRouteKey";

const walletState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  network: null as string | null,
}));

function makeMockStream(overrides: Partial<StreamRecord>): StreamRecord {
  return {
    id: "STR-000",
    name: "Mock Stream",
    recipientName: "Mock Recipient",
    recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
    treasuryName: "Mock Treasury",
    treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
    asset: "USDC",
    status: "Active",
    monthlyRate: 5000,
    depositAmount: 60000,
    streamedAmount: 25000,
    withdrawableAmount: 8000,
    remainingAmount: 35000,
    progress: 42,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    summary: "Mock stream for testing",
    health: "Healthy",
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
    ...overrides,
  };
}

const recipientStreamsState = vi.hoisted(() => ({
  streams: [] as StreamRecord[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
  addresses: [] as Array<string | null | undefined>,
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
  useRecipientStreams: (address: string | null | undefined) => {
    recipientStreamsState.addresses.push(address);
    return {
    streams: recipientStreamsState.streams,
    loading: recipientStreamsState.loading,
    error: recipientStreamsState.error,
    refetch: recipientStreamsState.refetch,
    retryCount: 0,
    };
  },
}));

vi.mock("../lib/stellar/tx", () => ({
  withdraw: withdrawMock,
}));

const MIN_LOADING_MS = 300;
const MIN_LOADING_OVERSHOOT = 50;

function renderRecipientAndWaitForMinLoading() {
  const result = render(<Recipient />);
  act(() => {
    vi.advanceTimersByTime(MIN_LOADING_MS + MIN_LOADING_OVERSHOOT);
  });
  return result;
}

function advancePastMinLoading() {
  act(() => {
    vi.advanceTimersByTime(MIN_LOADING_MS + MIN_LOADING_OVERSHOOT);
  });
}

describe("Recipient wallet source", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    recipientStreamsState.streams = [];
    recipientStreamsState.loading = false;
    recipientStreamsState.error = null;
    recipientStreamsState.refetch = vi.fn();
    recipientStreamsState.addresses = [];
    withdrawMock.mockReset();
    withdrawMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses disconnected state from useWallet for the empty state", () => {
    renderRecipientAndWaitForMinLoading();

    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).not.toBeInTheDocument();
  });

  it("enables the withdraw surface when useWallet reports a connected wallet", () => {
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    // Match the expected network so the on-chain mismatch guard does not
    // disable the withdraw action.
    walletState.network = "TESTNET";

    renderRecipientAndWaitForMinLoading();

    expect(
      screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });

  it("scopes the recipient query to the latest wallet account", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";

    const { rerender } = renderRecipientAndWaitForMinLoading();
    walletState.address = "GBQW7K4JQ7ZQWJ3A6VQJ2D4T6N5H7YQ2P4A6M8N0R2T4V6X8Z0C2E4G6I8";
    rerender(<Recipient />);

    expect(recipientStreamsState.addresses).toContain(walletState.address);
    expect(recipientStreamsState.addresses[recipientStreamsState.addresses.length - 1]).toBe(walletState.address);
  });

  it("changes the recipient surface identity when the route query changes", () => {
    expect(getRecipientRouteKey("/app/recipient", "?view=active")).not.toBe(
      getRecipientRouteKey("/app/recipient", "?view=history"),
    );
    expect(getRecipientRouteKey("/app/recipient", "")).not.toBe(
      getRecipientRouteKey("/app/streams", ""),
    );
  });

  it("withdraws using the selected live recipient stream id", async () => {
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [
      makeMockStream({
        id: "2",
        withdrawableAmount: 4200,
        streamedAmount: 5000,
      }),
    ];

    renderRecipientAndWaitForMinLoading();

    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw 4,200 USDC/i }),
    );

    await act(async () => {});

    expect(withdrawMock).toHaveBeenCalledWith(
      walletState.address,
      "2",
      "42000000000",
    );

    // The receipt shows the exact withdrawn amount (smallest-unit derived),
    // never a Number-rounded value.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("4,200.0000000 USDC")).toBeInTheDocument();
  });

  it("renders the exact withdrawal amount on the receipt for fractional balances", async () => {
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [
      makeMockStream({
        id: "2",
        withdrawableAmount: 4200.1234567,
        streamedAmount: 5000,
      }),
    ];

    renderRecipientAndWaitForMinLoading();

    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw 4,200 USDC/i }),
    );

    await act(async () => {});

    // 4200.1234567 USDC = 42001234567 smallest units — full precision preserved
    expect(withdrawMock).toHaveBeenCalledWith(
      walletState.address,
      "2",
      "42001234567",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("4,200.1234567 USDC")).toBeInTheDocument();
  });

  it("updates the document title when the tab is blurred and clears it on focus", () => {
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [
      makeMockStream({
        id: "1",
        withdrawableAmount: 4200,
        streamedAmount: 5000,
      }),
      makeMockStream({
        id: "2",
        withdrawableAmount: 2800,
        streamedAmount: 5000,
      }),
    ];

    renderRecipientAndWaitForMinLoading();

    // jsdom's document.hasFocus() is environment-dependent. Dispatch a focus
    // event first to guarantee isTabFocused=true before asserting the clean title.
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(document.title).toBe("Fluxora — Recipient portal");

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(document.title).toBe("(2) Fluxora — Recipient portal");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(document.title).toBe("Fluxora — Recipient portal");
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

  describe("Recipient Local Security Gate", () => {
    beforeEach(() => {
      localStorage.clear();
      // Mock window.PublicKeyCredential
      vi.stubGlobal("PublicKeyCredential", {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true)
      });
      // Mock navigator.credentials
      vi.stubGlobal("navigator", {
        ...navigator,
        credentials: {
          create: vi.fn().mockResolvedValue({}),
          get: vi.fn().mockResolvedValue({})
        }
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("renders the security gate settings card when connected", async () => {
      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipientAndWaitForMinLoading();
      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByText("Local Security Gate")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("runs biometric and PIN enrollment successfully", async () => {
      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipientAndWaitForMinLoading();
      await act(async () => {
        await Promise.resolve();
      });

      // Open enrollment
      fireEvent.click(screen.getByRole("button", { name: "Enable" }));
      expect(screen.getByText("Setup Security Gate")).toBeInTheDocument();

      // Register device biometrics
      fireEvent.click(screen.getByRole("button", { name: "Register Device Biometrics" }));
      
      // Since navigator.credentials.create resolves, it should proceed to PIN configuration step
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(screen.getByText("Set Security PIN")).toBeInTheDocument();

      // Enter PIN: "1234"
      fireEvent.click(screen.getByRole("button", { name: "1" }));
      fireEvent.click(screen.getByRole("button", { name: "2" }));
      fireEvent.click(screen.getByRole("button", { name: "3" }));
      fireEvent.click(screen.getByRole("button", { name: "4" }));

      // Wait for transition to confirm step
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.getByText("Confirm Security PIN")).toBeInTheDocument();

      // Re-enter matching PIN: "1234"
      fireEvent.click(screen.getByRole("button", { name: "1" }));
      fireEvent.click(screen.getByRole("button", { name: "2" }));
      fireEvent.click(screen.getByRole("button", { name: "3" }));
      fireEvent.click(screen.getByRole("button", { name: "4" }));

      // Wait for success transition
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.getByText("Setup Complete!")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Done" }));

      act(() => {
        vi.advanceTimersByTime(0);
      });

      const securityStatusBadge = screen.getByRole("status", { name: /local security gate status/i });
      expect(securityStatusBadge).toBeInTheDocument();
      expect(securityStatusBadge).toHaveTextContent(/active/i);
      expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
    });

    it("falls back to PIN setup when biometrics are unsupported", async () => {
      // Mock biometrics not supported
      vi.mocked(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable).mockResolvedValue(false);
      
      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipientAndWaitForMinLoading();
      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.click(screen.getByRole("button", { name: "Enable" }));
      
      // Should go straight to PIN setup (since checking support finds false)
      expect(screen.getByText("Set Security PIN")).toBeInTheDocument();
    });

    it("requires confirmation when withdrawing if local gate is active", async () => {
      // Setup enrolled state in localStorage
      localStorage.setItem("fluxora_security_gate_enabled", "true");
      localStorage.setItem("fluxora_biometric_enrolled", "true");
      localStorage.setItem("fluxora_backup_pin", "1234");

      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipientAndWaitForMinLoading();
      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.click(screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }));

      // Verification modal should open
      expect(screen.getByText("Authorize Withdrawal")).toBeInTheDocument();

      // Wait for triggerBiometricVerification promise resolution
      await act(async () => {
        await Promise.resolve(); // triggerBiometricVerification
        await Promise.resolve(); // navigator.credentials.get
      });

      // Advance timers to trigger the success transition delay (1000ms)
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(withdrawMock).toHaveBeenCalled();
    });

    it("allows bypassing the local gate via Skip to Wallet button", async () => {
      localStorage.setItem("fluxora_security_gate_enabled", "true");
      localStorage.setItem("fluxora_biometric_enrolled", "true");
      localStorage.setItem("fluxora_backup_pin", "1234");

      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipientAndWaitForMinLoading();
      await act(async () => {
        await Promise.resolve();
      });

      fireEvent.click(screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }));

      // Click skip/bypass
      fireEvent.click(screen.getByRole("button", { name: "Skip to Wallet signing" }));

      // Modal closes, withdraw triggers directly
      expect(screen.queryByText("Authorize Withdrawal")).not.toBeInTheDocument();
      expect(withdrawMock).toHaveBeenCalled();
    });
  });
});

describe("Recipient monthly summary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    walletState.connected = true;
    walletState.address =
      "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the monthly summary section when streams exist", () => {
    recipientStreamsState.streams = [
      makeMockStream({ id: "STR-001" }),
    ];

    renderRecipientAndWaitForMinLoading();

    expect(
      screen.getByRole("toolbar", { name: /select summary month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /print monthly summary/i }),
    ).toBeInTheDocument();
  });

  it("does not render the monthly summary when there are no live streams", () => {
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    expect(
      screen.queryByRole("toolbar", { name: /select summary month/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the print button when there is no activity for the month", () => {
    const pastYear = new Date().getFullYear() - 1;
    recipientStreamsState.streams = [
      makeMockStream({
        id: "STR-001",
        startDate: `${pastYear}-01-01`,
        endDate: `${pastYear}-06-30`,
      }),
    ];

    renderRecipientAndWaitForMinLoading();

    const printBtn = screen.getByRole("button", { name: /print monthly summary/i });
    expect(printBtn).toBeDisabled();
  });

  it("renders the current month label by default", () => {
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    recipientStreamsState.streams = [
      makeMockStream({ id: "STR-001" }),
    ];

    renderRecipientAndWaitForMinLoading();

    const toolbar = screen.getByRole("toolbar", { name: /select summary month/i });
    expect(within(toolbar).getByText(new RegExp(monthName, "i"))).toBeInTheDocument();
  });

  it("renders previous and next month navigation buttons", () => {
    recipientStreamsState.streams = [
      makeMockStream({ id: "STR-001" }),
    ];

    renderRecipientAndWaitForMinLoading();

    expect(
      screen.getByRole("button", { name: /previous month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next month/i }),
    ).toBeInTheDocument();
  });
});

describe("computeMonthlySummary utility", () => {
  it("correctly aggregates totals for a month with activity", () => {
    const result = computeMonthlySummary(
      [
        makeMockStream({
          id: "STR-001",
          monthlyRate: 5000,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          withdrawableAmount: 3000,
        }),
        makeMockStream({
          id: "STR-002",
          monthlyRate: 3000,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          withdrawableAmount: 2000,
        }),
      ],
      2026,
      6,
    );

    expect(result.hasActivity).toBe(true);
    expect(result.totalStreamed).toBe(8000);
    expect(result.withdrawableNow).toBe(5000);
  });

  it("returns no activity for a month with no streams", () => {
    const result = computeMonthlySummary([], 2026, 6);
    expect(result.hasActivity).toBe(false);
  });

  it("reads withdrawals from timeline events", () => {
    const result = computeMonthlySummary(
      [
        makeMockStream({
          timeline: [
            { date: "2026-06-15", title: "Recipient withdrew 4,200 USDC", detail: "" },
          ],
        }),
      ],
      2026,
      6,
    );

    expect(result.totalWithdrawn).toBe(4200);
  });
});

describe("Recipient page loading state hardening", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    recipientStreamsState.streams = [];
    recipientStreamsState.loading = false;
    recipientStreamsState.error = null;
    recipientStreamsState.refetch = vi.fn();
    withdrawMock.mockReset();
    withdrawMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows full-page RecipientLoading skeleton when wallet is connected and data is loading", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.loading = true;
    recipientStreamsState.streams = [];

    const { rerender } = render(<Recipient />);

    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();
    expect(screen.queryByText("Withdrawable now")).not.toBeInTheDocument();

    advancePastMinLoading();
    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();

    recipientStreamsState.loading = false;
    rerender(<Recipient />);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.queryByRole("status", { name: "Loading recipient portal" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Withdraw 22,600 USDC/i })).toBeInTheDocument();
  });

  it("respects minimum loading duration to prevent skeleton flash on fast fetches", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [makeMockStream({ id: "1" })];

    render(<Recipient />);

    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();

    advancePastMinLoading();
    expect(screen.queryByRole("status", { name: "Loading recipient portal" })).not.toBeInTheDocument();
  });

  it("displays full RecipientLoading indefinitely while useRecipientStreams.loading remains true", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    recipientStreamsState.loading = true;

    render(<Recipient />);

    for (let i = 0; i < 5; i++) {
      advancePastMinLoading();
    }

    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();
    expect(screen.queryByText("Withdrawable now")).not.toBeInTheDocument();
  });

  it("bypasses full-page RecipientLoading when wallet is disconnected (no pending recipient fetch)", () => {
    walletState.connected = false;
    walletState.address = null;

    render(<Recipient />);

    expect(screen.queryByRole("status", { name: "Loading recipient portal" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
  });

  it("transitions cleanly: loading skeleton → populated dashboard when live streams arrive", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.loading = true;
    recipientStreamsState.streams = [];

    const { rerender } = render(<Recipient />);
    advancePastMinLoading();
    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();

    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [
      makeMockStream({ id: "5", withdrawableAmount: 7500, streamedAmount: 10000 }),
    ];
    rerender(<Recipient />);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole("button", { name: /Withdraw 7,500 USDC/i })).toBeInTheDocument();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading recipient portal" })).not.toBeInTheDocument();
  });
});

describe("Recipient page error and retry state hardening", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    recipientStreamsState.streams = [];
    recipientStreamsState.loading = false;
    recipientStreamsState.error = null;
    recipientStreamsState.refetch = vi.fn();
    withdrawMock.mockReset();
    withdrawMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the inline error banner via RecipientEmptyState with retry button when service error occurs", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "Unable to load recipient streams.";
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Unable to load recipient streams.")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).toBeEnabled();
  });

  it("invokes useRecipientStreams.refetch via the page-level retry button when error state is active", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "RPC unavailable.";
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    expect(recipientStreamsState.refetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading data" }));

    expect(recipientStreamsState.refetch).toHaveBeenCalledTimes(1);
  });

  it("disables error Retry button while a refetch is in-flight to prevent double submission", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "temporary glitch";
    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    const retryBtnBefore = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtnBefore).toBeEnabled();
    expect(retryBtnBefore).toHaveAttribute("aria-disabled", "false");
    expect(recipientStreamsState.refetch).toHaveBeenCalledTimes(0);

    fireEvent.click(retryBtnBefore);

    expect(recipientStreamsState.refetch).toHaveBeenCalledTimes(1);

    const retryBtnAfter = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtnAfter).toBeDisabled();
    expect(retryBtnAfter).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(retryBtnAfter);
    expect(recipientStreamsState.refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps demo balance values hidden from the populated surface when a service error blocks confirmation", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "502 Bad Gateway";
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(screen.queryByText("Withdrawable now")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Withdraw 22,600 USDC/i })).not.toBeInTheDocument();
  });

  it("uses the error state path instead of populated page even when streams array has stale data", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "Network partition";
    recipientStreamsState.streams = [makeMockStream({ id: "1" })];

    renderRecipientAndWaitForMinLoading();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Withdrawable now")).not.toBeInTheDocument();
  });

  it("does not show any error alert when wallet is disconnected (no fetch attempted yet)", () => {
    walletState.connected = false;
    walletState.address = null;

    renderRecipientAndWaitForMinLoading();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /connect your wallet/i })).toBeInTheDocument();
  });

  it("moves focus to the retry button when a service error first appears (WCAG focus order)", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = null;
    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [];

    const { rerender } = render(<Recipient />);
    advancePastMinLoading();

    // Initially no error — connect wallet CTA is present
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Introduce error — retry button should receive focus
    recipientStreamsState.error = "Connection lost.";
    rerender(<Recipient />);
    act(() => { vi.advanceTimersByTime(0); });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtn).toHaveFocus();
  });

  it("retry button is a native button that supports keyboard activation by default", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.error = "retry me";
    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    const retryBtn = screen.getByRole("button", { name: "Retry loading data" });
    // Native <button> element — keyboard events handled by the browser
    expect(retryBtn.tagName).toBe("BUTTON");
  });

  it("retry button is disabled while the service is still loading after retry", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    // Start with an error
    recipientStreamsState.error = "temporary error";
    recipientStreamsState.loading = false;
    recipientStreamsState.streams = [];

    renderRecipientAndWaitForMinLoading();

    const retryBtnBefore = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtnBefore).toBeEnabled();

    // Click retry
    fireEvent.click(retryBtnBefore);

    // Now simulate concurrent loading + still having an error
    recipientStreamsState.loading = true;
    act(() => { vi.advanceTimersByTime(0); });

    const retryBtnAfter = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtnAfter).toBeDisabled();
  });

  it("bypasses full-page loading when wallet disconnects mid-fetch", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.loading = true;
    recipientStreamsState.streams = [];

    const { rerender } = render(<Recipient />);

    // Loading skeleton is visible
    expect(screen.getByRole("status", { name: "Loading recipient portal" })).toBeInTheDocument();

    // Wallet disconnects mid-fetch
    walletState.connected = false;
    walletState.address = null;
    rerender(<Recipient />);
    act(() => { vi.advanceTimersByTime(0); });

    // Should immediately show empty state, not loading skeleton
    expect(screen.queryByRole("status", { name: "Loading recipient portal" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
  });
});

describe("Recipient page backward-compat regression guards", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    recipientStreamsState.streams = [];
    recipientStreamsState.loading = false;
    recipientStreamsState.error = null;
    recipientStreamsState.refetch = vi.fn();
    withdrawMock.mockReset();
    withdrawMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("preserves the original disconnected empty-state copy and connected demo dashboard surface", () => {
    const { rerender } = render(<Recipient />);
    advancePastMinLoading();
    expect(screen.getByRole("heading", { name: /connect your wallet/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Withdraw/i })).not.toBeInTheDocument();

    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    rerender(<Recipient />);
    advancePastMinLoading();

    expect(screen.getByRole("button", { name: /Withdraw 22,600 USDC/i })).toBeInTheDocument();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
  });

  it("renders the Local Security Gate settings card alongside RecipientEmptyState when wallet is connected AND a service error forces the empty-state path", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [];
    recipientStreamsState.error = "Service error: empty path gate";

    renderRecipientAndWaitForMinLoading();

    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
    expect(screen.getByText("Local Security Gate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
  });

  it("falls back to demo balance values only when no service error AND no live streams AND wallet is connected", () => {
    walletState.connected = true;
    walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    walletState.network = "TESTNET";
    recipientStreamsState.streams = [];
    recipientStreamsState.error = null;

    const { rerender } = render(<Recipient />);
    advancePastMinLoading();

    recipientStreamsState.streams = [
      makeMockStream({
        id: "1",
        withdrawableAmount: 15000,
        streamedAmount: 30000,
      }),
    ];
    rerender(<Recipient />);

    expect(screen.getByRole("button", { name: /Withdraw 15,000 USDC/i })).toBeInTheDocument();
  });
});
