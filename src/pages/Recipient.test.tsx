import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeMonthlySummary } from "../utils/monthlySummary";
import type { StreamRecord } from "../data/streamRecords";
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

    renderRecipient();

    expect(
      screen.getByRole("button", { name: /Withdraw 22,600 USDC/i }),
    ).toBeEnabled();
    expect(screen.getByText("Withdrawable now")).toBeInTheDocument();
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

    renderRecipient();

    fireEvent.click(
      screen.getByRole("button", { name: /Withdraw 4,200 USDC/i }),
    );

    await act(async () => {});

    expect(withdrawMock).toHaveBeenCalledWith(
      walletState.address,
      "2",
      "42000000000",
    );
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

    renderRecipient();

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

      renderRecipient();
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

      renderRecipient();
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

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
    });

    it("falls back to PIN setup when biometrics are unsupported", async () => {
      // Mock biometrics not supported
      vi.mocked(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable).mockResolvedValue(false);
      
      walletState.connected = true;
      walletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
      walletState.network = "TESTNET";

      renderRecipient();
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

      renderRecipient();
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

      renderRecipient();
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

    renderRecipient();

    expect(
      screen.getByRole("toolbar", { name: /select summary month/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /print monthly summary/i }),
    ).toBeInTheDocument();
  });

  it("does not render the monthly summary when there are no live streams", () => {
    recipientStreamsState.streams = [];

    renderRecipient();

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

    renderRecipient();

    const printBtn = screen.getByRole("button", { name: /print monthly summary/i });
    expect(printBtn).toBeDisabled();
  });

  it("renders the current month label by default", () => {
    const now = new Date();
    const monthName = now.toLocaleString("en-US", { month: "long" });
    recipientStreamsState.streams = [
      makeMockStream({ id: "STR-001" }),
    ];

    renderRecipient();

    const toolbar = screen.getByRole("toolbar", { name: /select summary month/i });
    expect(within(toolbar).getByText(new RegExp(monthName, "i"))).toBeInTheDocument();
  });

  it("renders previous and next month navigation buttons", () => {
    recipientStreamsState.streams = [
      makeMockStream({ id: "STR-001" }),
    ];

    renderRecipient();

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
