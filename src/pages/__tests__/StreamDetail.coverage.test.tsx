import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StreamDetail from "../StreamDetail";
import { getStreamById } from "../../lib/api/streamsService";
import type { StreamRecord } from "../../data/streamRecords";

vi.mock("../../lib/api/streamsService", () => ({
  getStreamById: vi.fn(),
}));

vi.mock("../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-22T13:30:00.000Z",
}));

describe("StreamDetail Page Tests", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page with no streamId param and asserts 'Stream not found' state renders with a working 'Back to streams' link", async () => {
    render(
      <MemoryRouter initialEntries={["/app/streams"]}>
        <Routes>
          <Route path="/app/streams" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Stream not found")).toBeInTheDocument();

    const codeElement = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === "code" && content === "";
    });
    expect(codeElement).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: /back to streams/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/app/streams");
  });

  it("renders with a streamId containing characters that require URL-decoding and asserts getStreamById is called with the decoded value", async () => {
    const mockStream: StreamRecord = {
      id: "stream/123",
      name: "Decoded Stream Name",
      summary: "A test stream that needed decoding",
      status: "Active",
      health: "Healthy",
      healthNote: "All good",
      asset: "USDC",
      depositAmount: 10000,
      streamedAmount: 5000,
      withdrawableAmount: 3000,
      remainingAmount: 2000,
      progress: 50,
      startDate: "2026-07-01T00:00:00Z",
      endDate: "2026-07-31T00:00:00Z",
    };

    vi.mocked(getStreamById).mockResolvedValue(mockStream);

    render(
      <MemoryRouter initialEntries={["/app/streams/stream%2F123"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Decoded Stream Name", level: 1 })).toBeInTheDocument();
    expect(getStreamById).toHaveBeenCalledWith("stream/123", expect.any(AbortSignal));
  });

  it("renders the error path (getStreamById rejects) and asserts the role='alert' error UI renders with the rejection message", async () => {
    vi.mocked(getStreamById).mockRejectedValue(new Error("Stellar node query timeout"));

    render(
      <MemoryRouter initialEntries={["/app/streams/stream-error"]}>
        <Routes>
          <Route path="/app/streams/:streamId" element={<StreamDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const alertElement = await screen.findByRole("alert");
    expect(alertElement).toBeInTheDocument();
    expect(alertElement).toHaveTextContent("Error loading stream: Stellar node query timeout");

    const backLink = screen.getByRole("link", { name: /back to streams/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/app/streams");
  });
});
