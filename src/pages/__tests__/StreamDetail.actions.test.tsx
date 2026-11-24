import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import * as txModule from "../../lib/stellar/tx";
import { clearAll } from "../../lib/optimisticTransactions";
import type { StreamRecord } from "../../data/streamRecords";

const SENDER_ADDRESS =
  "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT";
const RECIPIENT_ADDRESS =
  "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

const mockWalletState = {
  connected: true,
  address: SENDER_ADDRESS as string | null,
  network: "TESTNET" as string | null,
  expectedNetwork: "TESTNET",
  isNetworkMismatch: false,
  loading: false,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  clearError: vi.fn(),
  retryConnect: vi.fn(),
  switchNetwork: vi.fn(),
};

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => mockWalletState,
}));

const mockStream: StreamRecord = {
  id: "STR-001",
  name: "Dev Grant - Alice",
  summary: "Core grant stream for protocol engineering.",
  recipientName: "Alice M.",
  recipientAddress: RECIPIENT_ADDRESS,
  treasuryName: "Protocol Growth Treasury",
  treasuryAddress: SENDER_ADDRESS,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  monthlyRate: 5000,
  startDate: "2026-01-15",
  endDate: "2026-10-15",
  status: "Active",
  health: "Healthy",
  healthNote: "Runway covers the remaining schedule.",
  asset: "USDC",
  progress: 40,
  auditNote: "",
  tags: [],
  timeline: [],
};

function renderStreamDetail(stream: StreamRecord = mockStream) {
  vi.spyOn(streamsService, "getStreamById").mockResolvedValue(stream);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/app/streams/${stream.id}`]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("StreamDetail pause and cancel actions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearAll();
    mockWalletState.connected = true;
    mockWalletState.address = SENDER_ADDRESS;
    mockWalletState.isNetworkMismatch = false;
    mockWalletState.loading = false;
    mockWalletState.error = null;
  });

  describe("authorisation", () => {
    it("shows Pause and Cancel buttons to the stream sender", async () => {
      renderStreamDetail();

      expect(await screen.findByTestId("pause-stream-btn")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-stream-btn")).toBeInTheDocument();
    });

    it("hides Pause and Cancel buttons for non-sender accounts and explains why", async () => {
      mockWalletState.address = RECIPIENT_ADDRESS;
      renderStreamDetail();

      expect(
        await screen.findByTestId("stream-controls-not-sender"),
      ).toHaveTextContent(SENDER_ADDRESS);
      expect(screen.queryByTestId("pause-stream-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cancel-stream-btn")).not.toBeInTheDocument();
    });

    it("renders RequireWalletAction fallback when wallet is not connected", async () => {
      mockWalletState.connected = false;
      mockWalletState.address = null;
      renderStreamDetail();

      expect(
        await screen.findByRole("heading", { name: mockStream.name }),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("pause-stream-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cancel-stream-btn")).not.toBeInTheDocument();
    });

    it("hides Pause and Cancel buttons for completed streams", async () => {
      renderStreamDetail({ ...mockStream, status: "Completed" });

      expect(
        await screen.findByTestId("stream-controls-terminal-notice"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("pause-stream-btn")).not.toBeInTheDocument();
      expect(screen.queryByTestId("cancel-stream-btn")).not.toBeInTheDocument();
    });
  });

  describe("confirmation modal and focus management", () => {
    it("requires explicit confirmation before cancelling and names stream and remaining balance", async () => {
      renderStreamDetail();

      const cancelTrigger = await screen.findByTestId("cancel-stream-btn");
      cancelTrigger.focus();
      fireEvent.click(cancelTrigger);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveTextContent("Dev Grant - Alice");
      expect(dialog).toHaveTextContent("STR-001");
      expect(dialog).toHaveTextContent("28,750");

      const confirmBtn = within(dialog).getByRole("button", {
        name: "Cancel stream",
      });
      expect(confirmBtn).toBeDisabled();

      const checkbox = screen.getByTestId("confirm-modal-explicit-checkbox");
      fireEvent.click(checkbox);
      expect(confirmBtn).toBeEnabled();

      // Close modal and verify focus returns to trigger button
      fireEvent.keyDown(window, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(document.activeElement).toBe(cancelTrigger);
    });
  });

  describe("submission, optimistic updates, receipt, and rollback", () => {
    it("optimistically pauses stream, submits pauseStream, and displays receipt on confirmation", async () => {
      let resolveTx!: (val: { txHash: string }) => void;
      const pauseSpy = vi
        .spyOn(txModule, "pauseStream")
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveTx = resolve as unknown as (val: { txHash: string }) => void;
            }),
        );
      vi.spyOn(txModule, "getTransactionStatus").mockResolvedValue("confirmed");

      renderStreamDetail();

      fireEvent.click(await screen.findByTestId("pause-stream-btn"));
      const confirmBtn = within(screen.getByRole("dialog")).getByRole(
        "button",
        { name: "Pause stream" },
      );
      fireEvent.click(confirmBtn);

      // Optimistic status updates immediately while tx is in-flight
      await waitFor(() => {
        expect(screen.getByTestId("stream-status")).toHaveAttribute(
          "data-status",
          "paused",
        );
      });
      expect(pauseSpy).toHaveBeenCalledWith(SENDER_ADDRESS, "STR-001");

      // Resolve transaction and verify receipt announcement
      resolveTx({ txHash: "TX_PAUSE_HASH_123" });

      expect(
        await screen.findByTestId("confirm-modal-receipt"),
      ).toHaveTextContent("TX_PAUSE_HASH_123");
      expect(screen.getByTestId("stream-status")).toHaveAttribute(
        "data-status",
        "paused",
      );
    });

    it("rolls back optimistic status and maps contract error via decodeContractError on failure", async () => {
      vi.spyOn(txModule, "pauseStream").mockRejectedValue(
        new Error("HostError: Error(Contract, #StreamAlreadyPaused)"),
      );

      renderStreamDetail();

      fireEvent.click(await screen.findByTestId("pause-stream-btn"));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Pause stream",
        }),
      );

      // Error is mapped to actionable i18n copy
      expect(
        await screen.findByText(/This stream is already paused/i),
      ).toBeInTheDocument();

      // Optimistic status rolled back to active
      expect(screen.getByTestId("stream-status")).toHaveAttribute(
        "data-status",
        "active",
      );
    });

    it("rolls back optimistic status when wallet rejects cancel signature", async () => {
      vi.spyOn(txModule, "cancelStream").mockRejectedValue(
        new txModule.TransactionError(
          "rejected",
          "Transaction signature request was declined by the user.",
          { retryable: true },
        ),
      );

      renderStreamDetail();

      fireEvent.click(await screen.findByTestId("cancel-stream-btn"));
      fireEvent.click(screen.getByTestId("confirm-modal-explicit-checkbox"));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Cancel stream",
        }),
      );

      expect(
        await screen.findByText(
          /Transaction signature was declined in your wallet/i,
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId("stream-status")).toHaveAttribute(
        "data-status",
        "active",
      );
    });
  });
});
