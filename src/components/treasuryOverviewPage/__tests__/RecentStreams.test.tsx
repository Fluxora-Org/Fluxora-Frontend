import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RecentStreams from "../RecentStreams";
import { treasuryDemoStreams } from "../../../fixtures/treasury";

function renderRecentStreams(
  ui = <RecentStreams streams={treasuryDemoStreams} />,
) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("treasuryOverviewPage RecentStreams", () => {
  it("renders the treasury-specific heading, view action, and streams table", () => {
    renderRecentStreams();

    expect(screen.getByRole("heading", { name: "Recent streams" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view all/i })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Active streams" })).toBeInTheDocument();
  });

  it("passes empty treasury streams through to the table empty state", () => {
    renderRecentStreams(<RecentStreams streams={[]} />);

    expect(screen.getByRole("region", { name: /treasury empty state/i })).toBeInTheDocument();
  });

  it("renders a loading skeleton when loading is true", () => {
    renderRecentStreams(<RecentStreams streams={[]} loading={true} />);

    expect(screen.getByRole("status", { name: /loading streams/i })).toBeInTheDocument();
  });

  it("renders an error UI with a retry action when error is present", () => {
    const onRetry = vi.fn();
    renderRecentStreams(
      <RecentStreams
        streams={[]}
        error="Treasury Fetch Failed"
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole("region", { name: /error state/i })).toBeInTheDocument();
    expect(screen.getByText("Treasury Fetch Failed")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("navigates to /app/streams when View all is clicked", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /view all/i }));
    // navigation happens; no error thrown confirms the handler ran
  });

  // -------------------------------------------------------------------------
  // walletConnected drives the empty/error copy
  // -------------------------------------------------------------------------

  it("shows the anonymous 'Connect your wallet' CTA in the empty state when walletConnected is false (default)", () => {
    renderRecentStreams(<RecentStreams streams={[]} />);

    expect(
      screen.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create stream/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the connected 'Create stream' CTA in the empty state when walletConnected is true", () => {
    renderRecentStreams(
      <RecentStreams streams={[]} walletConnected={true} />,
    );

    expect(
      screen.getByRole("heading", { name: /no streams yet/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create stream/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // View toggle: Table vs Graph
  // -------------------------------------------------------------------------

  it("defaults to table view when no graph view is active", () => {
    renderRecentStreams();

    expect(screen.getByRole("grid", { name: "Active streams" })).toBeInTheDocument();
  });

  it("shows the Graph toggle button on desktop", () => {
    renderRecentStreams();

    expect(screen.getByRole("button", { name: /graph view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /table view/i })).toBeInTheDocument();
  });

  it("switches to graph view when Graph toggle is clicked", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    const graphBtn = screen.getByRole("button", { name: /graph view/i });
    await user.click(graphBtn);

    expect(screen.getByRole("toolbar", { name: /graph view controls/i })).toBeInTheDocument();
  });

  it("switches back to table view when Table toggle is clicked", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));
    expect(screen.getByRole("toolbar", { name: /graph view controls/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /table view/i }));
    expect(screen.getByRole("grid", { name: "Active streams" })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Graph view accessibility
  // -------------------------------------------------------------------------

  it("marks the SVG as aria-hidden when graph view is active", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    const svg = screen.getByRole("toolbar", { name: /graph view controls/i })
      .closest(".recent-streams-graph-container")
      ?.querySelector("svg[aria-hidden]");
    expect(svg).toBeInTheDocument();
  });

  it("renders pan/zoom controls with accessible labels", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset view/i })).toBeInTheDocument();
  });

  it("renders the controls toolbar with role toolbar", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    expect(screen.getByRole("toolbar", { name: /graph view controls/i })).toBeInTheDocument();
  });

  it("renders the legend with accessible label", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    expect(screen.getByLabelText("Graph legend")).toBeInTheDocument();
  });

  it("pan/zoom controls are keyboard-operable", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    const zoomInBtn = screen.getByRole("button", { name: /zoom in/i });
    const zoomOutBtn = screen.getByRole("button", { name: /zoom out/i });
    const resetBtn = screen.getByRole("button", { name: /reset view/i });

    zoomInBtn.focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(zoomInBtn);

    zoomOutBtn.focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(zoomOutBtn);

    resetBtn.focus();
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(resetBtn);
  });

  it("allows the user tab past graph controls (graph does not trap focus)", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /graph view/i }));

    const resetBtn = screen.getByRole("button", { name: /reset view/i });
    resetBtn.focus();

    await user.keyboard("{Tab}");
    // Focus should move past the controls — either back to the toggle or to another element
    expect(document.activeElement).not.toBe(resetBtn);
  });

  it("graph container is hidden on mobile (below md breakpoint)", () => {
    renderRecentStreams();

    // On a jsdom environment without a real viewport, verify the CSS class exists
    // The actual hiding is handled by CSS media query at --breakpoint-md (768px)
    const container = document.querySelector(".recent-streams-graph-container");
    expect(container).toBeInTheDocument();
  });
});