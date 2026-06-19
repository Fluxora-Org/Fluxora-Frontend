import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RecentStreams from "../RecentStreams";

function renderRecentStreams(ui = <RecentStreams />) {
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

    expect(screen.getByText("No streams found")).toBeInTheDocument();
  });
});
