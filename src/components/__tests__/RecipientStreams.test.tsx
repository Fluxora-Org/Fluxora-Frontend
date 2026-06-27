import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecipientStreams, type Stream } from "../recipient/RecipientStreams";

const mockData: Stream[] = [
  { id: "1", sender: "Alice", amount: "500", status: "active" },
];

describe("RecipientStreams Testing Engine", () => {
  it("shows safe recoverable loading elements on initial interaction", async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValue(
        new Promise((resolve) => setTimeout(() => resolve(mockData), 50)),
      );

    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
  });

  it("safely displays a secure error fallback upon network failure", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("Database crash dump info"));

    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    const errorAlert = await screen.findByRole("status");

    expect(errorAlert).toBeInTheDocument();
    expect(
      screen.queryByText("Database crash dump info"),
    ).not.toBeInTheDocument();
  });

  it("guards against concurrent execution calls when double-clicked", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      return new Promise((resolve) => setTimeout(() => resolve(mockData), 100));
    });

    render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
    const btn = screen.getByText("Refreshing...");

    fireEvent.click(btn);
    fireEvent.click(btn);

    // Initial load is in flight, so rapid clicks are blocked by the concurrency guard.
    expect(callCount).toBe(1);
  });
});
