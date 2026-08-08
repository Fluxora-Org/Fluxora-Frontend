import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";

const renderWithHelmet = (ui: React.ReactElement) => {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
};

/**
 * A valid stream the current wallet is NOT a party to.
 * The wallet address used in tests is:
 *   GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF
 * which differs from both the recipient and treasury of this stream.
 */
const foreignStream: StreamRecord = {
  id: "STR-FOREIGN-001",
  name: "Engineering Grant",
  summary: "Monthly allocation for core developers",
  recipientName: "Alice",
  recipientAddress: "GD5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5Q5PJ5",
  treasuryName: "Treasury",
  treasuryAddress: "GB7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7Q7PJ7",
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

describe("StreamDetail — Foreign wallet access", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders not-found state when API returns null for a foreign stream", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-FOREIGN-001"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();
    expect(screen.getByText("STR-FOREIGN-001")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to streams/i }),
    ).toBeInTheDocument();
  });

  it("renders not-found state when recipient differs from connected wallet", async () => {
    // The API returns null for a stream whose recipient address does not
    // match the connected wallet — simulating server-side authorization
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-FOREIGN-001"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();

    // No recipient/amount/rate details should be visible
    expect(screen.queryByText(/Engineering Grant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Monthly allocation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/10,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Healthy/i)).not.toBeInTheDocument();
  });

  it("renders not-found state when treasury differs from connected wallet", async () => {
    // Same assertion as above — the API returns null when the connected
    // wallet is not a party (neither recipient nor treasury) to the stream
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-FOREIGN-001"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();

    // The "Back to streams" link should be present for navigation
    const backLink = screen.getByRole("link", { name: /back to streams/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/app/streams");
  });

  it("renders stream details normally when wallet IS a party to the stream", async () => {
    // A stream where the connected wallet IS the recipient
    const ownedStream: StreamRecord = {
      ...foreignStream,
      recipientAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    };

    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(ownedStream);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-OWNED-001"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    // Full stream details should render
    expect(
      await screen.findByRole("heading", { name: "Engineering Grant" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Monthly allocation for core developers"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Healthy/)).toBeInTheDocument();
  });

  it("renders not-found state for a non-existent stream ID even when wallet is connected", async () => {
    // A stream ID that doesn't exist in the system
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(null);

    renderWithHelmet(
      <MemoryRouter initialEntries={["/app/streams/STR-NONEXISTENT"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();
    expect(screen.getByText("STR-NONEXISTENT")).toBeInTheDocument();
  });
});