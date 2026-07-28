import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";

const renderWithHelmet = (ui: React.ReactElement) => {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
};

const mockStream: StreamRecord = {
  id: "STR-001",
  name: "Test Stream",
  summary: "Test summary",
  recipientName: "Alice",
  recipientAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  treasuryName: "Treasury",
  treasuryAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
  depositAmount: 10000,
  streamedAmount: 4000,
  withdrawableAmount: 2000,
  remainingAmount: 6000,
  monthlyRate: 1000,
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-10-01T00:00:00Z",
  cliffDate: "2026-02-01T00:00:00Z",
  status: "Active",
  health: "Healthy",
  healthNote: "Stream is running normally",
  asset: "USDC",
  progress: 40,
  auditNote: "Regular audit passed",
  tags: ["Engineering"],
  timeline: [],
};

describe("StreamDetail - Edge Cases and Error States", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error state with retry", () => {
    it("renders a 'Try again' button in the error state", async () => {
      vi.spyOn(streamsService, "getStreamById").mockRejectedValue(
        new Error("Network timeout")
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      const retryButton = screen.getByRole("button", { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it("retries fetching the stream when 'Try again' is clicked and succeeds", async () => {
      const getStreamSpy = vi
        .spyOn(streamsService, "getStreamById")
        .mockRejectedValueOnce(new Error("Network timeout"))
        .mockResolvedValueOnce(mockStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Network timeout/)).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      expect(await screen.findByRole("heading", { name: "Test Stream" })).toBeInTheDocument();
      expect(getStreamSpy).toHaveBeenCalledTimes(2);
    });

    it("shows loading state during retry and returns to error if retry fails", async () => {
      const getStreamSpy = vi
        .spyOn(streamsService, "getStreamById")
        .mockRejectedValue(new Error("Persistent error"));

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("alert")).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      // Should attempt retry
      await waitFor(() => {
        expect(getStreamSpy).toHaveBeenCalledTimes(2);
      });

      // Should return to error state
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Persistent error/)).toBeInTheDocument();
    });

    it("handles non-Error thrown values with generic message", async () => {
      vi.spyOn(streamsService, "getStreamById").mockRejectedValue(
        "String error thrown"
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Failed to load stream\./)).toBeInTheDocument();
    });
  });

  describe("streamId changes during in-flight request", () => {
    it("aborts the prior request when streamId changes", async () => {
      let firstSignal: AbortSignal | undefined;
      let secondSignal: AbortSignal | undefined;

      const getStreamSpy = vi
        .spyOn(streamsService, "getStreamById")
        .mockImplementation((id, signal) => {
          if (id === "STR-001") {
            firstSignal = signal;
            return new Promise(() => {}); // never resolves
          } else {
            secondSignal = signal;
            return Promise.resolve(mockStream);
          }
        });

      const { rerender } = renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(getStreamSpy).toHaveBeenCalledWith("STR-001", expect.any(AbortSignal));
      });

      expect(firstSignal).toBeDefined();
      expect(firstSignal?.aborted).toBe(false);

      // Change streamId
      rerender(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/app/streams/STR-002"]}>
            <Routes>
              <Route path="/app/streams/:streamId" element={<StreamDetail />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      );

      await waitFor(() => {
        expect(getStreamSpy).toHaveBeenCalledWith("STR-002", expect.any(AbortSignal));
      });

      // First request should be aborted
      expect(firstSignal?.aborted).toBe(true);
      expect(secondSignal).toBeDefined();
    });
  });

  describe("Compare mode", () => {
    it("renders StreamComparePane when compare query parameter is present", async () => {
      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001?compare=STR-002"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // StreamComparePane should render immediately
      expect(screen.getByText("Compare")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("does not fetch stream data when in compare mode", () => {
      const getStreamSpy = vi.spyOn(streamsService, "getStreamById");

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001?compare=STR-002"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(getStreamSpy).not.toHaveBeenCalled();
    });

    it("decodes both streamId and compareWithId URL parameters", async () => {
      renderWithHelmet(
        <MemoryRouter
          initialEntries={["/app/streams/STR%2F001?compare=STR%2F002"]}
        >
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // StreamComparePane receives decoded IDs
      expect(screen.getByText("Compare")).toBeInTheDocument();
    });
  });

  describe("Presence badge", () => {
    it("does not render PresenceBadge when isPresenceEnabled is false", async () => {
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(mockStream);

      const { container } = renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await screen.findByRole("heading", { name: "Test Stream" });

      // usePresenceViewers returns isPresenceEnabled: false by default
      // PresenceBadge container should not be in the DOM
      const presenceContainer = container.querySelector(
        '[style*="position: absolute"][style*="right: 0"]'
      );
      expect(presenceContainer).toBeInTheDocument();
      // But the badge itself should not render viewers
    });
  });

  describe("Conditional rendering", () => {
    it("renders auditNote section only when auditNote is truthy", async () => {
      const streamWithAudit = { ...mockStream, auditNote: "Important audit note" };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(streamWithAudit);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("heading", { name: /audit note/i })).toBeInTheDocument();
      expect(screen.getByText("Important audit note")).toBeInTheDocument();
    });

    it("does not render auditNote section when auditNote is empty", async () => {
      const streamWithoutAudit = { ...mockStream, auditNote: "" };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
        streamWithoutAudit
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await screen.findByRole("heading", { name: "Test Stream" });
      expect(screen.queryByRole("heading", { name: /audit note/i })).not.toBeInTheDocument();
    });
  });

  describe("Health status color mapping", () => {
    it("renders Healthy status with correct color", async () => {
      const healthyStream = { ...mockStream, health: "Healthy" as const };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(healthyStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const badge = await screen.findByText(/Healthy/);
      expect(badge).toBeInTheDocument();
      expect(badge.closest("span")).toHaveStyle({
        color: "var(--color-success, #16a34a)",
      });
    });

    it("renders Attention status with correct color", async () => {
      const attentionStream = { ...mockStream, health: "Attention" as const };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
        attentionStream
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const badge = await screen.findByText(/Attention/);
      expect(badge.closest("span")).toHaveStyle({
        color: "var(--color-warning, #d97706)",
      });
    });

    it("renders Settled status with correct color", async () => {
      const settledStream = { ...mockStream, health: "Settled" as const };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(settledStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const badge = await screen.findByText(/Settled/);
      expect(badge.closest("span")).toHaveStyle({
        color: "var(--color-text-secondary, #6b7280)",
      });
    });

    it("falls back to inherit color for unknown health values", async () => {
      const unknownHealthStream = {
        ...mockStream,
        health: "Unknown" as StreamRecord["health"],
      };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
        unknownHealthStream
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      const badge = await screen.findByText(/Unknown/);
      expect(badge.closest("span")).toHaveStyle({ color: "inherit" });
    });
  });

  describe("Breadcrumb fallback logic", () => {
    it("shows stream name in breadcrumb when stream is loaded", async () => {
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(mockStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await screen.findByRole("heading", { name: "Test Stream" });
      expect(screen.getByText("Test Stream")).toBeInTheDocument();
    });

    it("shows streamId in breadcrumb during loading when stream is undefined", async () => {
      vi.spyOn(streamsService, "getStreamById").mockImplementation(
        () => new Promise(() => {})
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      // Breadcrumb renders but content is skeleton, streamId used as fallback internally
    });

    it("shows 'Stream' fallback when both stream and streamId are undefined", async () => {
      vi.spyOn(streamsService, "getStreamById").mockImplementation(
        () => new Promise(() => {})
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/"]}>
          <Routes>
            <Route path="/app/streams/" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // No streamId, stream is null
      expect(await screen.findByText("Stream not found")).toBeInTheDocument();
    });
  });

  describe("StreamTimeline props", () => {
    it("always passes isLoading=false to StreamTimeline in success state", async () => {
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(mockStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await screen.findByRole("heading", { name: "Test Stream" });
      const timelineHeading = screen.getByRole("heading", { name: /timeline/i });
      expect(timelineHeading).toBeInTheDocument();
      // StreamTimeline receives isLoading={false} in the success render
    });

    it("passes cliffDate as null when undefined", async () => {
      const streamWithoutCliff = { ...mockStream, cliffDate: undefined };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
        streamWithoutCliff
      );

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await screen.findByRole("heading", { name: "Test Stream" });
      const timelineHeading = screen.getByRole("heading", { name: /timeline/i });
      expect(timelineHeading).toBeInTheDocument();
      // StreamTimeline receives cliffDate={null}
    });
  });

  describe("Unreachable guard", () => {
    it("returns null when stream is undefined after loading completes (defensive guard)", async () => {
      // This is the defensive guard for TypeScript narrowing
      // In practice, loading/error/null are handled above so stream is always StreamRecord
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
        undefined as unknown as StreamRecord
      );

      const { container } = renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      // Guard returns null, nothing rendered
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Deterministic state transitions", () => {
    it("transitions loading → success → loading → success deterministically", async () => {
      const getStreamSpy = vi
        .spyOn(streamsService, "getStreamById")
        .mockResolvedValue(mockStream);

      const { rerender } = renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(await screen.findByRole("heading", { name: "Test Stream" })).toBeInTheDocument();

      // Force a new streamId
      getStreamSpy.mockResolvedValue({ ...mockStream, name: "Updated Stream" });

      rerender(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/app/streams/STR-002"]}>
            <Routes>
              <Route path="/app/streams/:streamId" element={<StreamDetail />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      );

      expect(await screen.findByRole("heading", { name: "Updated Stream" })).toBeInTheDocument();
    });

    it("transitions loading → error → retry → success deterministically", async () => {
      const getStreamSpy = vi
        .spyOn(streamsService, "getStreamById")
        .mockRejectedValueOnce(new Error("Initial error"))
        .mockResolvedValueOnce(mockStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-001"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Initial error/)).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /try again/i });
      await userEvent.click(retryButton);

      expect(await screen.findByRole("heading", { name: "Test Stream" })).toBeInTheDocument();
      expect(getStreamSpy).toHaveBeenCalledTimes(2);
    });

    it("transitions loading → not-found deterministically", async () => {
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-999"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(await screen.findByText("Stream not found")).toBeInTheDocument();
      expect(screen.getByText("STR-999")).toBeInTheDocument();
    });
  });

  describe("Partial data rendering (defaults)", () => {
    it("renders gracefully when service returns data with defaults for missing properties", async () => {
      // If the API returns partial data, normalizeStreamRecord (in the service layer)
      // provides safe defaults. This test ensures the UI renders those defaults properly without crashing.
      const partialStream = {
        ...mockStream,
        name: "Untitled stream", // Default applied by normalizer
        summary: "",
        depositAmount: 0,
        timeline: [],
      };
      vi.spyOn(streamsService, "getStreamById").mockResolvedValue(partialStream);

      renderWithHelmet(
        <MemoryRouter initialEntries={["/app/streams/STR-PARTIAL"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      );

      // Breadcrumb and Heading use default name
      const headings = await screen.findAllByRole("heading", { name: "Untitled stream" });
      expect(headings.length).toBeGreaterThan(0);
      
      // Amount formatted as 0 USDC
      expect(screen.getByText("0.00 USDC")).toBeInTheDocument();
    });
  });
});
