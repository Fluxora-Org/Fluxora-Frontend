import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EmptyState from "../EmptyState";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns all SVG elements inside the given container. */
function getAllSvgs(container: HTMLElement) {
  return Array.from(container.querySelectorAll("svg"));
}

// ── aria-hidden on decorative SVGs ────────────────────────────────────────────

describe("EmptyState — decorative SVGs have aria-hidden='true'", () => {
  const variants = ["treasury", "streams", "recipient", "search-no-results", "error"] as const;

  variants.forEach((variant) => {
    it(`all SVGs in the ${variant} variant are aria-hidden`, () => {
      const { container } = render(
        <EmptyState variant={variant} walletConnected={false} />
      );
      const svgs = getAllSvgs(container);
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });

    it(`all SVGs in the ${variant} variant (connected) are aria-hidden`, () => {
      const { container } = render(
        <EmptyState variant={variant} walletConnected={true} />
      );
      const svgs = getAllSvgs(container);
      expect(svgs.length).toBeGreaterThan(0);
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  it("error banner SVG is aria-hidden", () => {
    const { container } = render(
      <EmptyState variant="treasury" walletConnected={true} error="Something went wrong" />
    );
    const svgs = getAllSvgs(container);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });
});

// ── Accessible region label ───────────────────────────────────────────────────

describe("EmptyState — accessible region labels", () => {
  it("treasury variant has correct region label", () => {
    render(<EmptyState variant="treasury" />);
    expect(screen.getByRole("region", { name: "Treasury empty state" })).toBeInTheDocument();
  });

  it("streams variant has correct region label", () => {
    render(<EmptyState variant="streams" />);
    expect(screen.getByRole("region", { name: "Streams empty state" })).toBeInTheDocument();
  });

  it("recipient variant has correct region label", () => {
    render(<EmptyState variant="recipient" />);
    expect(screen.getByRole("region", { name: "Recipient empty state" })).toBeInTheDocument();
  });

  it("search-no-results variant has correct region label", () => {
    render(<EmptyState variant="search-no-results" />);
    expect(screen.getByRole("region", { name: "Search no results state" })).toBeInTheDocument();
  });

  it("error variant has correct region label", () => {
    render(<EmptyState variant="error" />);
    expect(screen.getByRole("region", { name: "Error state" })).toBeInTheDocument();
  });
});

// ── Loading skeleton ──────────────────────────────────────────────────────────

describe("EmptyState — loading state", () => {
  it("renders loading skeleton with role=status", () => {
    render(<EmptyState variant="treasury" loading={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("loading skeleton has accessible label", () => {
    render(<EmptyState variant="treasury" loading={true} />);
    expect(screen.getByRole("status", { name: "Loading content" })).toBeInTheDocument();
  });
});

// ── Error banner ──────────────────────────────────────────────────────────────

describe("EmptyState — error state", () => {
  it("renders error message in an alert role", () => {
    render(<EmptyState variant="treasury" error="Network error" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<EmptyState variant="treasury" error="Oops" onRetry={onRetry} />);
    const btn = screen.getByRole("button", { name: /retry/i });
    expect(btn).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    const { getByRole } = render(
      <EmptyState variant="treasury" error="Oops" onRetry={onRetry} />
    );
    getByRole("button", { name: /retry/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

// ── CTA button ────────────────────────────────────────────────────────────────

describe("EmptyState — CTA button", () => {
  it("renders CTA with correct aria-label when disconnected", () => {
    render(<EmptyState variant="treasury" walletConnected={false} />);
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
  });

  it("renders CTA with correct aria-label when connected (treasury)", () => {
    render(<EmptyState variant="treasury" walletConnected={true} />);
    expect(screen.getByRole("button", { name: "Create stream" })).toBeInTheDocument();
  });

  it("calls onPrimaryAction when CTA is clicked", () => {
    const onPrimaryAction = vi.fn();
    render(
      <EmptyState variant="treasury" walletConnected={true} onPrimaryAction={onPrimaryAction} />
    );
    screen.getByRole("button", { name: "Create stream" }).click();
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });
});

// ── search-no-results variant ─────────────────────────────────────────────────

describe("EmptyState — search-no-results variant", () => {
  it("renders heading 'No results found'", () => {
    render(<EmptyState variant="search-no-results" walletConnected={true} />);
    expect(screen.getByRole("heading", { name: /no results found/i })).toBeInTheDocument();
  });

  it("renders 'Clear filters' CTA", () => {
    render(<EmptyState variant="search-no-results" walletConnected={true} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("calls onClearFilters when CTA is clicked", () => {
    const onClearFilters = vi.fn();
    render(
      <EmptyState
        variant="search-no-results"
        walletConnected={true}
        onClearFilters={onClearFilters}
      />
    );
    screen.getByRole("button", { name: /clear filters/i }).click();
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("all SVGs are aria-hidden", () => {
    const { container } = render(
      <EmptyState variant="search-no-results" walletConnected={true} />
    );
    getAllSvgs(container).forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("has accessible region label", () => {
    render(<EmptyState variant="search-no-results" />);
    expect(
      screen.getByRole("region", { name: "Search no results state" })
    ).toBeInTheDocument();
  });
});

// ── error variant ─────────────────────────────────────────────────────────────

describe("EmptyState — error variant", () => {
  it("renders heading 'Something went wrong'", () => {
    render(<EmptyState variant="error" walletConnected={true} />);
    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
  });

  it("renders 'Try again' CTA", () => {
    render(<EmptyState variant="error" walletConnected={true} />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("calls onRetry when CTA is clicked", () => {
    const onRetry = vi.fn();
    render(
      <EmptyState variant="error" walletConnected={true} onRetry={onRetry} />
    );
    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders custom errorMessage when provided", () => {
    render(
      <EmptyState
        variant="error"
        walletConnected={true}
        errorMessage="Custom error: 503 Service Unavailable"
      />
    );
    expect(screen.getByText(/503 Service Unavailable/i)).toBeInTheDocument();
  });

  it("all SVGs are aria-hidden", () => {
    const { container } = render(
      <EmptyState variant="error" walletConnected={true} />
    );
    getAllSvgs(container).forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("has accessible region label", () => {
    render(<EmptyState variant="error" />);
    expect(screen.getByRole("region", { name: "Error state" })).toBeInTheDocument();
  });
});
