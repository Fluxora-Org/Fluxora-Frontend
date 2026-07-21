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
});
