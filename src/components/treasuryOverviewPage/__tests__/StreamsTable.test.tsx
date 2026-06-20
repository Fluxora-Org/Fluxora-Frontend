import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import StreamsTable from "../StreamsTable";
import { treasuryDemoStreams as streams } from "../../../fixtures/treasury";

function renderTable(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("StreamsTable", () => {
  it("renders the treasury stream headers and sample row count", () => {
    renderTable(<StreamsTable streams={streams} />);

    for (const label of ["STREAM", "RECIPIENT", "RATE", "STATUS", "ACTION"]) {
      expect(screen.getByRole("columnheader", { name: label })).toBeInTheDocument();
    }

    const grid = screen.getByRole("grid", { name: "Active streams" });
    expect(grid).toHaveAttribute("aria-rowcount", String(streams.length));
    expect(within(grid).getAllByRole("row")).toHaveLength(streams.length + 1);
  });

  it("renders an empty state when no treasury streams are available", () => {
    renderTable(<StreamsTable streams={[]} />);

    expect(screen.getByText("No recent streams available.")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Active streams" })).toHaveAttribute(
      "aria-rowcount",
      "0"
    );
  });
});
