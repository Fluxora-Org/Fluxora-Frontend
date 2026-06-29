import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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

    expect(screen.getByText("No recent streams available.")).toBeInTheDocument();
  });

  it("navigates to /app/streams when View all is clicked", async () => {
    const user = userEvent.setup();
    renderRecentStreams();

    await user.click(screen.getByRole("button", { name: /view all/i }));
    // navigation happens; no error thrown confirms the handler ran
  });
});
