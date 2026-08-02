import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail, { AT_RISK_RUNWAY_HOURS } from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";

const mockStream = (overrides: Partial<StreamRecord> = {}): StreamRecord => ({
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
  ...overrides,
});

const renderStreamDetail = (stream: StreamRecord) => {
  vi.spyOn(streamsService, "getStreamById").mockResolvedValue(stream);
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
};

describe("StreamDetail at-risk health state", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the 'At risk' badge when the remaining runway is below 48 hours", async () => {
    // 1000 monthlyRate = 33.33/day = 1.39/hr
    // 50 remainingAmount / 33.33 = 1.5 days = 36 hours < 48 ✓
    renderStreamDetail(
      mockStream({ remainingAmount: 50, monthlyRate: 1000 }),
    );

    expect(await screen.findByText("At risk")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: /treasury runway below 48 hours/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render the 'At risk' badge when the runway is above 48 hours", async () => {
    // 5000 remainingAmount / 33.33 = 150 days = 3600 hours > 48 ✓
    renderStreamDetail(
      mockStream({ remainingAmount: 5000, monthlyRate: 1000 }),
    );

    expect(await screen.findByText("Healthy — Stream is running normally")).toBeInTheDocument();
    expect(screen.queryByText("At risk")).not.toBeInTheDocument();
  });

  it("does NOT render the 'At risk' badge when monthlyRate is zero", async () => {
    renderStreamDetail(
      mockStream({ remainingAmount: 1, monthlyRate: 0 }),
    );

    expect(await screen.findByText("Healthy — Stream is running normally")).toBeInTheDocument();
    expect(screen.queryByText("At risk")).not.toBeInTheDocument();
  });

  it("does NOT render the 'At risk' badge when the stream is settled", async () => {
    // 50 remainingAmount / 33.33 = 36 hours < 48, but not active
    renderStreamDetail(
      mockStream({ remainingAmount: 50, monthlyRate: 1000, status: "Completed", health: "Settled", healthNote: "Stream has ended" }),
    );

    expect(await screen.findByText(/Settled/)).toBeInTheDocument();
    expect(screen.queryByText("At risk")).not.toBeInTheDocument();
  });

  it("exports AT_RISK_RUNWAY_HOURS as a named constant", () => {
    expect(AT_RISK_RUNWAY_HOURS).toBe(48);
  });
});