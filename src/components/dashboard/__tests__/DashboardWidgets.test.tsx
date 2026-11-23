import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import DashboardSummaryWidget from "../DashboardSummaryWidget";
import DashboardStreamsWidget from "../DashboardStreamsWidget";
import type { Stream } from "../../RecentStreams";

const stream: Stream = {
  id: "STR-001",
  name: "Dev Grant - Alice",
  recipient: "GABC123",
  rate: "5,000.00 USDC / mo",
  status: "Active",
};

/** The streams widget renders router links, so it needs a router in scope. */
function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DashboardSummaryWidget", () => {
  it("renders each of its three cards from the numbers it is given", () => {
    render(
      <DashboardSummaryWidget
        streamCount={3}
        totalStreaming={1500}
        withdrawable={22600}
        loading={false}
      />,
    );

    expect(screen.getByLabelText("Treasury summary")).toBeInTheDocument();
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1,500.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("22,600.00 USDC")).toBeInTheDocument();
  });

  it("renders placeholders while loading instead of holding back the layout", () => {
    render(
      <DashboardSummaryWidget streamCount={0} totalStreaming={0} withdrawable={null} loading />,
    );

    // The card labels still paint, so a slow request never blanks this widget.
    expect(screen.getByText("Active Streams")).toBeInTheDocument();
    expect(screen.getByText("Total Streaming")).toBeInTheDocument();
    expect(screen.getByText("Withdrawable")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
    expect(screen.getAllByText("-- USDC")).toHaveLength(2);
  });

  it("shows placeholders for a disconnected wallet", () => {
    render(
      <DashboardSummaryWidget
        streamCount={2}
        totalStreaming={900}
        withdrawable={null}
        loading={false}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("900.00 USDC")).toBeInTheDocument();
    expect(screen.getByText("-- USDC")).toBeInTheDocument();
  });
});

describe("DashboardStreamsWidget", () => {
  it("shows its own loading state without the create action", () => {
    renderWithRouter(
      <DashboardStreamsWidget
        streams={[]}
        loading
        error={null}
        walletConnected
        onRetry={vi.fn()}
        onCreateStream={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Loading streams")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create stream" }),
    ).not.toBeInTheDocument();
  });

  it("owns its error state and retries through the callback it was given", () => {
    const onRetry = vi.fn();

    renderWithRouter(
      <DashboardStreamsWidget
        streams={[]}
        loading={false}
        error="Unable to load treasury data."
        walletConnected
        onRetry={onRetry}
        onCreateStream={vi.fn()}
      />,
    );

    expect(screen.getByText("Unable to load treasury data.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders its streams and the create action once loaded", () => {
    const onCreateStream = vi.fn();

    renderWithRouter(
      <DashboardStreamsWidget
        streams={[stream]}
        loading={false}
        error={null}
        walletConnected
        onRetry={vi.fn()}
        onCreateStream={onCreateStream}
      />,
    );

    expect(screen.getByText("Dev Grant - Alice")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create stream" }));

    expect(onCreateStream).toHaveBeenCalledTimes(1);
  });

  it("does not render the create action while a request has failed", () => {
    renderWithRouter(
      <DashboardStreamsWidget
        streams={[]}
        loading={false}
        error="Unable to load treasury data."
        walletConnected
        onRetry={vi.fn()}
        onCreateStream={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Create stream" }),
    ).not.toBeInTheDocument();
  });
});
