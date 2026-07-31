import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Header from "../Header";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

describe("TreasuryOverviewHeader", () => {
  it("renders the treasury heading with theme-aware text styles and no fixed black/white color class", () => {
    render(<Header />);

    const heading = screen.getByRole("heading", { name: "Treasury overview" });
    const subtext = screen.getByText("Your streaming activity at a glance.");

    expect(heading).toBeInTheDocument();
    expect(subtext).toBeInTheDocument();
    expect(heading.className).not.toContain("text-black");
    expect(heading.className).not.toContain("text-white");
    expect(subtext.className).not.toContain("text-black");
    expect(subtext.className).not.toContain("text-white");
  });

  it("uses design-token-based styling for the Create stream button with no hardcoded Tailwind color utilities", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: /Create stream/i });
    expect(button).toBeInTheDocument();

    // Assert no raw Tailwind utility color classes remain
    expect(button.className).not.toContain("bg-cyan");
    expect(button.className).not.toContain("shadow-cyan");

    // Assert design-token inline styles are applied
    const buttonStyle = button.getAttribute("style") || "";
    expect(buttonStyle).toContain("var(--color-accent-primary)");
    expect(buttonStyle).toContain("var(--shadow-accent-primary)");
  });

  describe("last updated timestamp", () => {
    it('shows "Never updated" when lastUpdatedAt is not provided', () => {
      render(<Header />);
      expect(screen.getByText("Never updated")).toBeInTheDocument();
    });

    it('shows "Never updated" when lastUpdatedAt is null', () => {
      render(<Header lastUpdatedAt={null} />);
      expect(screen.getByText("Never updated")).toBeInTheDocument();
    });

    it('shows "Last updated just now" for a recent timestamp', () => {
      const now = Date.now();
      render(<Header lastUpdatedAt={now} />);
      expect(screen.getByText("Last updated just now")).toBeInTheDocument();
    });

    it('shows "Last updated 30s ago" for 30 seconds ago', () => {
      const now = Date.now();
      render(<Header lastUpdatedAt={now - 30_000} />);
      expect(screen.getByText("Last updated 30s ago")).toBeInTheDocument();
    });

    it('shows "Last updated 2m ago" for 2 minutes ago', () => {
      const now = Date.now();
      render(<Header lastUpdatedAt={now - 120_000} />);
      expect(screen.getByText("Last updated 2m ago")).toBeInTheDocument();
    });

    it('shows "Last updated 1h ago" for 1 hour ago', () => {
      const now = Date.now();
      render(<Header lastUpdatedAt={now - 3_600_000} />);
      expect(screen.getByText("Last updated 1h ago")).toBeInTheDocument();
    });

    it("uses aria-live polite for accessibility", () => {
      const now = Date.now();
      render(<Header lastUpdatedAt={now} />);

      const caption = screen.getByText("Last updated just now");
      expect(caption).toHaveAttribute("aria-live", "polite");
    });
  });
});

describe("Treasury Header refresh control", () => {
  it("announces completion after a manual metrics refresh", () => {
    const onRefresh = vi.fn();
    render(<Header onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh metrics" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Treasury metrics refresh completed.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});