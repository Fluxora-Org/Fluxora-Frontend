import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import type { StreamsRequestOptions } from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";

const renderWithHelmet = (ui: React.ReactElement) => {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
};

const mockStream: StreamRecord = {
  id: "STR-123",
  name: "Engineering Grant",
  summary: "Monthly allocation for core developers",
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
  cliffDate: undefined,
  status: "Active",
  health: "Healthy",
  healthNote: "Stream is running normally",
  asset: "USDC",
  progress: 40,
  auditNote: "",
  tags: [],
  timeline: [],
};

describe("StreamDetail Page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state while getStreamById is pending", () => {
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status", { name: /loading stream/i })).toBeInTheDocument();
  });

  it("renders stream details when fetched successfully", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(mockStream);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Engineering Grant" })).toBeInTheDocument();
    expect(screen.getByText("Monthly allocation for core developers")).toBeInTheDocument();
    expect(screen.getByText("Healthy — Stream is running normally")).toBeInTheDocument();
  });

  it("renders Stream not found state when stream is null", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-999"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();
    expect(screen.getByText("STR-999")).toBeInTheDocument();
  });

  it("renders error state when getStreamById rejects", async () => {
    vi.spyOn(streamsService, "getStreamById").mockRejectedValue(
      new Error("Network connection failed"),
    );

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Network connection failed/)).toBeInTheDocument();
  });

  it("handles empty streamId parameter without fetching", () => {
    const spy = vi.spyOn(streamsService, "getStreamById");

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/"]}>
        <Routes>
          <Route path="/app/streams/" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("Stream not found")).toBeInTheDocument();
  });

  it("passes decoded streamId and AbortSignal to getStreamById", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (_id: string, signalOrOptions?: AbortSignal | StreamsRequestOptions) => {
        capturedSignal =
          signalOrOptions instanceof AbortSignal
            ? signalOrOptions
            : undefined;
        return Promise.resolve(mockStream);
      },
    );

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR%2F123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(streamsService.getStreamById).toHaveBeenCalledWith(
        "STR/123",
        expect.any(AbortSignal),
      );
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);
  });

  it("aborts the in-flight request when component unmounts before resolution", () => {
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (_id: string, signalOrOptions?: AbortSignal | StreamsRequestOptions) => {
        capturedSignal =
          signalOrOptions instanceof AbortSignal
            ? signalOrOptions
            : undefined;
        return new Promise(() => {}); // never resolves
      },
    );

    const { unmount } = renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("does not update component state if fetch resolves after unmount", async () => {
    let resolveStream: (value: StreamRecord | null) => void = () => {};
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      (_id: string) =>
        new Promise((resolve) => {
          resolveStream = resolve;
        }),
    );

    const { unmount } = renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    unmount();

    // Resolve the promise after unmount; should not throw React unmounted state update warning
    resolveStream(mockStream);
  });

  it("renders large stream amounts via formatAssetAmount instead of bare toLocaleString", async () => {
    const largeMock = {
      ...mockStream,
      depositAmount: Number.MAX_SAFE_INTEGER,
      streamedAmount: Number.MAX_SAFE_INTEGER,
      withdrawableAmount: Number.MAX_SAFE_INTEGER,
      remainingAmount: Number.MAX_SAFE_INTEGER,
    };
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(largeMock);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    const ddElements = await screen.findAllByText(/9,007,199,254,740,991 USDC/);
    expect(ddElements.length).toBe(4);
  });

  it("returns null when stream resolves to undefined and loading is false", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(
      undefined as unknown as StreamRecord,
    );

    const { container } = renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    expect(container.firstChild).toBeNull();
  });
});
