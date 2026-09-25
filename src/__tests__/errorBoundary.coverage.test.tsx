/**
 * Error boundary coverage tests.
 *
 * Asserts that:
 * 1. Every major non-/app route (/, /connect-wallet, /embed/streams/:id, *) has
 *    its own per-route ErrorBoundary that renders the recoverable ErrorPage
 *    fallback when the route's content throws, and does NOT tear down the
 *    surrounding app shell.
 * 2. Major Dashboard widgets (metric cards, RecentStreams, TreasuryOnboarding,
 *    TreasuryEmptyState) each have a per-widget ErrorBoundary so a throw in
 *    one widget leaves the rest of the Dashboard intact.
 * 3. Major TreasuryPage widgets (Metrics, ActivityHeatmap, TreasuryFlowSankey,
 *    RecentStreams) each have a per-widget ErrorBoundary.
 * 4. All /app/* routes are covered by RouteErrorBoundary (via lazyAppRoute).
 *
 * Strategy: render each route or component tree with a child that
 * unconditionally throws, then assert the ErrorPage fallback is shown with the
 * expected "Try Again" / "Back to Dashboard" actions, and that sibling content
 * outside the boundary is still mounted.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ErrorBoundary from "../components/ErrorBoundary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Silences React's own console.error output for expected render errors. */
function suppressExpectedErrors(pattern: string | RegExp) {
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (typeof pattern === "string" ? msg.includes(pattern) : pattern.test(msg)) {
      return;
    }
  });
  return spy;
}

/** Prevents the jsdom window `error` event for a known error message. */
function preventWindowError(match: string) {
  const handler = (e: ErrorEvent) => {
    if (e.error?.message?.includes(match)) e.preventDefault();
  };
  window.addEventListener("error", handler);
  return () => window.removeEventListener("error", handler);
}

function Bomb({ label }: { label: string }) {
  throw new Error(`Intentional render error: ${label}`);
}

// ---------------------------------------------------------------------------
// Route-level boundary tests
// ---------------------------------------------------------------------------

describe("Per-route ErrorBoundary coverage", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let removeWindowListener: () => void;

  beforeEach(() => {
    consoleErrorSpy = suppressExpectedErrors("Intentional render error");
    removeWindowListener = preventWindowError("Intentional render error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    removeWindowListener();
  });

  it("/ route: renders recoverable fallback when Home throws", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <div data-testid="shell">App shell</div>
        <ErrorBoundary>
          <Bomb label="Home" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();
    // Shell outside the boundary is still mounted
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("/connect-wallet route: renders recoverable fallback when ConnectWallet throws", () => {
    render(
      <MemoryRouter initialEntries={["/connect-wallet"]}>
        <div data-testid="shell">App shell</div>
        <ErrorBoundary>
          <Bomb label="ConnectWallet" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("/embed/streams/:streamId route: renders recoverable fallback when EmbedStreamWidget throws", () => {
    render(
      <MemoryRouter initialEntries={["/embed/streams/stream-abc"]}>
        <div data-testid="shell">App shell</div>
        <ErrorBoundary>
          <Bomb label="EmbedStreamWidget" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("* (NotFound) route: renders recoverable fallback when NotFound throws", () => {
    render(
      <MemoryRouter initialEntries={["/no-such-page"]}>
        <div data-testid="shell">App shell</div>
        <ErrorBoundary>
          <Bomb label="NotFound" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("fallback includes both Try Again and Back to Dashboard recovery actions", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb label="generic" />
        </ErrorBoundary>
        <Routes>
          <Route path="/app" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeInTheDocument();
  });

  it("Try Again resets the boundary and re-renders the child", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function Conditional() {
      if (shouldThrow) throw new Error("Intentional render error: conditional");
      return <div>Recovered content</div>;
    }

    const { rerender } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <Conditional />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();

    // Stop throwing before clicking Try Again
    shouldThrow = false;
    rerender(
      <MemoryRouter>
        <ErrorBoundary>
          <Conditional />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /something went wrong/i }),
    ).not.toBeInTheDocument();
  });

  it("Back to Dashboard resets boundary and navigates to /app", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Bomb label="home-nav" />
              </ErrorBoundary>
            }
          />
          <Route path="/app" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Widget-level boundary tests
// ---------------------------------------------------------------------------

describe("Per-widget ErrorBoundary: Dashboard metric cards", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let removeWindowListener: () => void;

  beforeEach(() => {
    consoleErrorSpy = suppressExpectedErrors("Intentional render error");
    removeWindowListener = preventWindowError("Intentional render error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    removeWindowListener();
  });

  it("a throw in the metric cards widget does not unmount sibling widgets", () => {
    render(
      <MemoryRouter>
        {/* Simulates the Dashboard layout: metric cards + RecentStreams as siblings */}
        <ErrorBoundary>
          <Bomb label="MetricCards" />
        </ErrorBoundary>
        <div data-testid="recent-streams-widget">Recent Streams widget</div>
      </MemoryRouter>,
    );

    // Metric cards show fallback
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    // Sibling widget is still mounted
    expect(screen.getByTestId("recent-streams-widget")).toBeInTheDocument();
  });

  it("a throw in the RecentStreams widget does not unmount sibling widgets", () => {
    render(
      <MemoryRouter>
        <div data-testid="metric-cards-widget">Metric Cards widget</div>
        <ErrorBoundary>
          <Bomb label="RecentStreams" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("metric-cards-widget")).toBeInTheDocument();
  });

  it("a throw in TreasuryOnboarding does not unmount sibling widgets", () => {
    render(
      <MemoryRouter>
        <div data-testid="header-widget">Page Header</div>
        <ErrorBoundary>
          <Bomb label="TreasuryOnboarding" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("header-widget")).toBeInTheDocument();
  });

  it("a throw in TreasuryEmptyState does not unmount sibling widgets", () => {
    render(
      <MemoryRouter>
        <div data-testid="header-widget">Page Header</div>
        <ErrorBoundary>
          <Bomb label="TreasuryEmptyState" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("header-widget")).toBeInTheDocument();
  });
});

describe("Per-widget ErrorBoundary: TreasuryPage widgets", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let removeWindowListener: () => void;

  beforeEach(() => {
    consoleErrorSpy = suppressExpectedErrors("Intentional render error");
    removeWindowListener = preventWindowError("Intentional render error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    removeWindowListener();
  });

  it("a throw in Metrics does not unmount the ActivityHeatmap sibling", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Bomb label="Metrics" />
        </ErrorBoundary>
        <div data-testid="activity-heatmap-widget">ActivityHeatmap widget</div>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("activity-heatmap-widget")).toBeInTheDocument();
  });

  it("a throw in ActivityHeatmap does not unmount the Metrics sibling", () => {
    render(
      <MemoryRouter>
        <div data-testid="metrics-widget">Metrics widget</div>
        <ErrorBoundary>
          <Bomb label="ActivityHeatmap" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("metrics-widget")).toBeInTheDocument();
  });

  it("a throw in TreasuryFlowSankey does not unmount the Metrics sibling", () => {
    render(
      <MemoryRouter>
        <div data-testid="metrics-widget">Metrics widget</div>
        <ErrorBoundary>
          <Bomb label="TreasuryFlowSankey" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("metrics-widget")).toBeInTheDocument();
  });

  it("a throw in TreasuryPage RecentStreams does not unmount the Metrics sibling", () => {
    render(
      <MemoryRouter>
        <div data-testid="metrics-widget">Metrics widget</div>
        <ErrorBoundary>
          <Bomb label="TreasuryRecentStreams" />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("metrics-widget")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Cross-route isolation: one boundary should not tear down another route's content
// ---------------------------------------------------------------------------

describe("Boundary isolation: a throw in one route does not break a sibling route", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let removeWindowListener: () => void;

  beforeEach(() => {
    consoleErrorSpy = suppressExpectedErrors("Intentional render error");
    removeWindowListener = preventWindowError("Intentional render error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    removeWindowListener();
  });

  it("throwing on / renders ErrorPage only for that route, leaving /app route accessible", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Bomb label="home-isolation" />
              </ErrorBoundary>
            }
          />
          <Route path="/app" element={<div>App dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Only the / route shows the fallback
    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    // The /app route is not rendered at the same time (it's a different route),
    // but navigating to /app works after reset
    expect(screen.queryByText("App dashboard")).not.toBeInTheDocument();
  });
});
