import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONBOARDING_DISMISSED_STORAGE_KEY } from "../lib/onboarding";
import type { StreamRecord } from "../data/streamRecords";
import Dashboard from "./Dashboard";

/**
 * Dashboard-level isolation.
 *
 * The dashboard composes independent widgets. These tests assert that one
 * widget's trouble — a crashing render, a slow request, a failed request —
 * never blanks the widgets around it.
 */

const control = vi.hoisted(() => ({
  wallet: { connected: true, address: "GCONNECTED", network: "TESTNET" },
  treasury: { loading: false, error: null as string | null, streams: [] as StreamRecord[] },
  /** When true the streams widget throws during render. */
  streamsWidgetCrashes: false,
  refetch: vi.fn(),
}));

vi.mock("../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...control.wallet,
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
    streams: control.treasury.streams,
    loading: control.treasury.loading,
    error: control.treasury.error,
    refetch: control.refetch,
    retryCount: 0,
  }),
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    retryCount: 0,
  }),
}));

// Delegate to the real widget unless a test asks for a crash, so the slow and
// failed states exercised here are the genuine ones.
vi.mock("../components/dashboard/DashboardStreamsWidget", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../components/dashboard/DashboardStreamsWidget")>();
  return {
    default: (props: Parameters<typeof actual.default>[0]) => {
      if (control.streamsWidgetCrashes) throw new Error("streams widget crashed");
      return actual.default(props);
    },
  };
});

/** Only the fields the dashboard reads are meaningful here. */
function streamRecord(overrides: Partial<StreamRecord> = {}): StreamRecord {
  return {
    id: "STR-001",
    name: "Dev Grant - Alice",
    recipientName: "Alice M.",
    recipientAddress: "GABC123",
    treasuryName: "Growth Treasury",
    treasuryAddress: "GTRE123",
    asset: "USDC",
    status: "Active",
    monthlyRate: 5000,
    depositAmount: 1500,
    streamedAmount: 0,
    withdrawableAmount: 0,
    remainingAmount: 1500,
    progress: 0,
    startDate: "2026-01-15",
    endDate: "2026-10-15",
    summary: "",
    health: "Healthy",
    healthNote: "",
    auditNote: "",
    tags: [],
    timeline: [],
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("Dashboard widget isolation", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs every caught render error; keep the suite output readable.
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    control.streamsWidgetCrashes = false;
    control.treasury.loading = false;
    control.treasury.error = null;
    control.treasury.streams = [streamRecord()];
    control.refetch.mockReset();
    localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "true");
  });

  afterEach(() => {
    consoleError.mockRestore();
    localStorage.clear();
  });

  it("keeps the rest of the dashboard when one widget crashes", () => {
    control.streamsWidgetCrashes = true;

    renderDashboard();

    // The page itself is still there.
    expect(
      screen.getByRole("heading", { level: 1, name: "Treasury overview" }),
    ).toBeInTheDocument();

    // The summary widget still renders its own data.
    expect(screen.getByLabelText("Treasury summary")).toBeInTheDocument();
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
    expect(screen.getByText("1,500.00 USDC")).toBeInTheDocument();

    // Only the failed widget is replaced, and it says so.
    const fallback = document.querySelector('[data-widget-error="Recent streams"]');
    expect(fallback).not.toBeNull();
    expect(
      screen.getByText("Recent streams could not be displayed"),
    ).toBeInTheDocument();
  });

  it("lets the failed widget recover on retry without reloading the page", () => {
    control.streamsWidgetCrashes = true;
    control.refetch.mockImplementation(() => {
      control.streamsWidgetCrashes = false;
    });

    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Retry Recent streams" }));

    expect(control.refetch).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-widget-error="Recent streams"]'),
    ).toBeNull();
    expect(screen.getByText("Dev Grant - Alice")).toBeInTheDocument();
  });

  it("renders the summary while the streams widget is still loading", () => {
    control.treasury.loading = true;

    renderDashboard();

    // The slow widget shows its own skeleton...
    expect(screen.getByLabelText("Loading streams")).toBeInTheDocument();
    // ...and does not hold the rest of the page hostage.
    expect(
      screen.getByRole("heading", { level: 1, name: "Treasury overview" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Treasury summary")).toBeInTheDocument();
    expect(screen.getByText("Withdrawable")).toBeInTheDocument();
  });

  it("keeps the summary readable when the streams widget fails", () => {
    control.treasury.loading = false;
    control.treasury.error = "Unable to load treasury data.";

    renderDashboard();

    // The streams widget reports the failure...
    expect(screen.getAllByText("Unable to load treasury data.").length).toBeGreaterThan(0);
    // ...while the summary keeps rendering its own values.
    expect(screen.getByText("1,500.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("22,600.00 USDC")).toBeInTheDocument();
  });
});
