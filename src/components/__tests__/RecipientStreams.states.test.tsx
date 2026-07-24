// Tests for RecipientStreams component state handling
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecipientStreams } from "../recipient/RecipientStreams";

// Mock data for a single stream
const mockStream = {
  id: "stream-1",
  sender: "GABCD...",
  amount: "1000",
  status: "active" as const,
  isPinned: false,
};

describe("RecipientStreams component state matrix", () => {
  it("renders empty state when no streams returned", async () => {
    const fetchMock = vi.fn().mockResolvedValue([]);
    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    const noStreams = await screen.findByText(/no incoming streams detected/i);
    expect(noStreams).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    const statusAlert = await screen.findByRole("status");
    expect(statusAlert).toHaveTextContent(/failed to sync latest stream data/i);
  });

  it("renders populated streams list and handles refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue([mockStream]);
    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    const heading = screen.getByRole("heading", { name: /incoming streams/i });
    expect(heading).toBeInTheDocument();
    const sender = await screen.findByText(`From: ${mockStream.sender}`);
    expect(sender).toBeInTheDocument();

    const refreshBtn = screen.getByRole("button", { name: /refresh status/i });
    fireEvent.click(refreshBtn);
    expect(fetchMock).toHaveBeenCalled();
  });
});
