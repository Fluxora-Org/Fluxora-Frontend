import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import * as icsExport from "../../lib/icsExport";
import type { StreamRecord } from "../../data/streamRecords";

const baseStream: StreamRecord = {
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
  startDate: "2026-01-01",
  endDate: "2026-10-01",
  cliffDate: "2026-03-01",
  status: "Active",
  health: "Healthy",
  healthNote: "Stream is running normally",
  asset: "USDC",
  progress: 40,
  auditNote: "",
  tags: [],
  timeline: [],
};

function renderStreamDetail() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/app/streams/STR-123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("StreamDetail calendar export", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is keyboard accessible and announces cliff and end dates download", async () => {
    const user = userEvent.setup();
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(baseStream);
    const downloadSpy = vi
      .spyOn(icsExport, "downloadStreamIcs")
      .mockReturnValue({
        filename: "fluxora-stream-STR-123.ics",
        hasCliff: true,
      });

    renderStreamDetail();

    const button = await screen.findByTestId("add-to-calendar-btn");
    button.focus();
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(downloadSpy).toHaveBeenCalledWith(baseStream);
    expect(screen.getByTestId("calendar-export-status")).toHaveTextContent(
      "Calendar file downloaded with cliff and end dates.",
    );
  });

  it("announces end date download when stream has no cliff", async () => {
    const user = userEvent.setup();
    const noCliffStream: StreamRecord = { ...baseStream, cliffDate: undefined };
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue(noCliffStream);
    const downloadSpy = vi
      .spyOn(icsExport, "downloadStreamIcs")
      .mockReturnValue({
        filename: "fluxora-stream-STR-123.ics",
        hasCliff: false,
      });

    renderStreamDetail();

    const button = await screen.findByTestId("add-to-calendar-btn");
    await user.click(button);

    expect(downloadSpy).toHaveBeenCalledWith(noCliffStream);
    expect(screen.getByTestId("calendar-export-status")).toHaveTextContent(
      "Calendar file downloaded with stream end date.",
    );
  });
});
