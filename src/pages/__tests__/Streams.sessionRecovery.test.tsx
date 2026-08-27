import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Streams from "../Streams";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { streamRecords } from "../../data/streamRecords";
import {
  DEFAULT_STREAMS_FILTERS,
  writeStreamsSession,
} from "../../lib/streamsSessionRecovery";

const ALICE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const BOB = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const mockWalletAddress = { current: ALICE };
const mockWalletLoading = { current: false };

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: mockWalletAddress.current,
    network: "TESTNET",
    connected: true,
    loading: mockWalletLoading.current,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    metrics: [],
    streams: streamRecords,
    loading: false,
    error: null,
    refetch: vi.fn(),
    retryCount: 0,
  }),
}));

function renderStreams() {
  const ui = (
    <ToastProvider>
      <MemoryRouter initialEntries={["/app/streams"]}>
        <Routes>
          <Route path="/app/streams" element={<Streams />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );

  return render(ui);
}

describe("Streams session recovery account isolation", () => {
  beforeEach(() => {
    mockWalletAddress.current = ALICE;
    mockWalletLoading.current = false;
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("waits for verified wallet identity before reading a saved session", async () => {
    writeStreamsSession(
      {
        filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-only" },
        draft: null,
      },
      Date.now(),
      ALICE,
    );
    mockWalletLoading.current = true;

    const view = renderStreams();
    expect(
      screen.queryByRole("status", {
        name: /we restored your previous session/i,
      }),
    ).not.toBeInTheDocument();

    mockWalletLoading.current = false;
    view.rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={["/app/streams"]}>
          <Routes>
            <Route path="/app/streams" element={<Streams />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("status", {
          name: /we restored your previous session/i,
        }),
      ).toBeInTheDocument();
    });
  });

  it("clears Alice recovery state before offering Bob's snapshot", async () => {
    writeStreamsSession(
      {
        filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "alice-only" },
        draft: null,
      },
      Date.now(),
      ALICE,
    );
    writeStreamsSession(
      {
        filters: { ...DEFAULT_STREAMS_FILTERS, searchQuery: "bob-only" },
        draft: null,
      },
      Date.now(),
      BOB,
    );

    const view = renderStreams();
    const searchInput = await screen.findByLabelText(
      "Search streams by name, ID or recipient",
    );
    await waitFor(() => {
      expect(
        screen.getByRole("status", {
          name: /we restored your previous session/i,
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(searchInput).toHaveValue("alice-only");

    mockWalletAddress.current = BOB;
    view.rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={["/app/streams"]}>
          <Routes>
            <Route path="/app/streams" element={<Streams />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(
        screen.getByRole("status", {
          name: /we restored your previous session/i,
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(searchInput).toHaveValue("bob-only");
  });
});
