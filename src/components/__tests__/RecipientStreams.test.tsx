import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

  describe("theme-aware styling via design tokens", () => {
    beforeEach(() => {
      document.documentElement.removeAttribute("data-theme");
    });

    it("renders with token-based colors independent of OS dark mode preference", async () => {
      // Set data-theme explicitly to "dark" while jsdom matchMedia reports light
      document.documentElement.setAttribute("data-theme", "dark");

      const fetchMock = vi.fn().mockResolvedValue([
        { id: "1", sender: "Alice", amount: "500", status: "active" },
      ]);

      render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
      const streams = await screen.findByText(/From:/);
      expect(streams).toBeInTheDocument();

      // Verify the outer card uses var() tokens, not Tailwind dark: classes
      const card = streams.closest(".p-6");
      expect(card).toBeInTheDocument();
      expect(card?.getAttribute("style")).toContain("var(--color-bg-primary)");

      // Verify heading uses theme token
      const heading = screen.getByText("Incoming Streams");
      expect(heading.getAttribute("style")).toContain("var(--color-text-primary)");
    });

    it("renders correctly when app theme toggle (light) disagrees with OS dark preference", async () => {
      // Simulate OS dark preference via matchMedia
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      // But app explicitly sets data-theme="light"
      document.documentElement.setAttribute("data-theme", "light");

      const fetchMock = vi.fn().mockResolvedValue([
        { id: "1", sender: "Alice", amount: "500", status: "active" },
      ]);

      render(<RecipientStreams fetchStreamsFn={fetchMock} pollIntervalMs={0} />);
      const streams = await screen.findByText(/From:/);
      expect(streams).toBeInTheDocument();

      // Card should show light-theme token (var(--color-bg-primary) resolves to --surface-base which is white)
      const card = streams.closest(".p-6");
      expect(card?.getAttribute("style")).toContain("var(--color-bg-primary)");

      // Verify error uses token colors
      const errorFetchMock = vi.fn().mockRejectedValue(new Error("fail"));
      document.documentElement.setAttribute("data-theme", "dark");
      render(<RecipientStreams fetchStreamsFn={errorFetchMock} pollIntervalMs={0} />);
      const errorAlert = await screen.findByRole("status");
      expect(errorAlert.getAttribute("style")).toContain("var(--color-error-text)");
      expect(errorAlert.getAttribute("style")).toContain("var(--color-error-bg)");
    });
  });
});
