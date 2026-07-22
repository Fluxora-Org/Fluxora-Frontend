import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import StreamsTable from "../StreamsTable";
import { treasuryDemoStreams as streams } from "../../../fixtures/treasury";
import type { Stream } from "../Stream";

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

  it("uses design token for empty-state text color instead of hardcoded Tailwind class", () => {
    renderTable(<StreamsTable streams={[]} />);

    const emptyStateCell = screen.getByText("No recent streams available.");
    expect(emptyStateCell).not.toHaveClass("text-gray-500");
    expect(emptyStateCell).toHaveStyle({ color: "var(--color-text-muted)" });
  it("toggles sort direction from ascending to descending when clicking the same column header twice", async () => {
    const user = userEvent.setup();
    renderTable(<StreamsTable streams={streams} />);

    const streamHeader = screen.getByRole("columnheader", { name: "STREAM" });
    expect(streamHeader).toHaveAttribute("aria-sort", "none");

    const streamButton = screen.getByRole("button", { name: "STREAM" });

    // Click once -> ascending
    await user.click(streamButton);
    expect(streamHeader).toHaveAttribute("aria-sort", "ascending");

    // Click twice -> descending
    await user.click(streamButton);
    expect(streamHeader).toHaveAttribute("aria-sort", "descending");

    // Click thrice -> ascending again
    await user.click(streamButton);
    expect(streamHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("resets to default ascending direction when switching sort column", async () => {
    const user = userEvent.setup();
    renderTable(<StreamsTable streams={streams} />);

    const streamHeader = screen.getByRole("columnheader", { name: "STREAM" });
    const recipientHeader = screen.getByRole("columnheader", { name: "RECIPIENT" });

    const streamButton = screen.getByRole("button", { name: "STREAM" });
    const recipientButton = screen.getByRole("button", { name: "RECIPIENT" });

    // Sort stream descending
    await user.click(streamButton);
    await user.click(streamButton);
    expect(streamHeader).toHaveAttribute("aria-sort", "descending");
    expect(recipientHeader).toHaveAttribute("aria-sort", "none");

    // Switch to recipient -> starts at expected default direction (ascending)
    await user.click(recipientButton);
    expect(streamHeader).toHaveAttribute("aria-sort", "none");
    expect(recipientHeader).toHaveAttribute("aria-sort", "ascending");
  });

  it("preserves relative order for equal-key rows (sort stability)", async () => {
    const user = userEvent.setup();
    const testStreams: Stream[] = [
      { id: "S1", name: "Stream Beta", recipient: "0x1111", rate: "10", accruedAmount: 100, status: "Active" },
      { id: "S2", name: "Stream Alpha", recipient: "0x2222", rate: "20", accruedAmount: 100, status: "Active" },
      { id: "S3", name: "Stream Gamma", recipient: "0x3333", rate: "30", accruedAmount: 100, status: "Active" },
    ];

    renderTable(<StreamsTable streams={testStreams} />);

    const rateButton = screen.getByRole("button", { name: "RATE" });

    // Sort ascending by RATE (all rates accruedAmount = 100, so all keys are equal)
    await user.click(rateButton);

    const tbody = screen.getByRole("grid").querySelector("tbody")!;
    let rowIds = Array.from(tbody.querySelectorAll("tr")).map(
      (row) => row.querySelector("div.text-xs")?.textContent
    );
    expect(rowIds).toEqual(["S1", "S2", "S3"]);

    // Sort descending by RATE
    await user.click(rateButton);
    rowIds = Array.from(tbody.querySelectorAll("tr")).map(
      (row) => row.querySelector("div.text-xs")?.textContent
    );
    expect(rowIds).toEqual(["S1", "S2", "S3"]);
  });

  it("supports sorting by rate and status columns", async () => {
    const user = userEvent.setup();
    const testStreams: Stream[] = [
      { id: "S1", name: "Stream A", recipient: "0x1", rate: "10 USDC", status: "Paused" },
      { id: "S2", name: "Stream B", recipient: "0x2", rate: "5 USDC", status: "Active" },
    ];

    renderTable(<StreamsTable streams={testStreams} />);

    const statusButton = screen.getByRole("button", { name: "STATUS" });
    await user.click(statusButton);

    const tbody = screen.getByRole("grid").querySelector("tbody")!;
    let rows = Array.from(tbody.querySelectorAll("tr")).map(
      (row) => row.querySelector("div.text-xs")?.textContent
    );
    // Active comes before Paused
    expect(rows).toEqual(["S2", "S1"]);

    const rateButton = screen.getByRole("button", { name: "RATE" });
    await user.click(rateButton);

    rows = Array.from(tbody.querySelectorAll("tr")).map(
      (row) => row.querySelector("div.text-xs")?.textContent
    );
    // String rate comparison: "10 USDC" vs "5 USDC" -> "10 USDC" before "5 USDC"
    expect(rows).toEqual(["S1", "S2"]);
  });

  it("supports keyboard navigation across rows", async () => {
    const user = userEvent.setup();
    renderTable(<StreamsTable streams={streams} />);

    const tbody = screen.getByRole("grid").querySelector("tbody")!;
    const rows = tbody.querySelectorAll<HTMLTableRowElement>("tr[tabindex]");

    rows[0]?.focus();
    expect(document.activeElement).toBe(rows[0]);

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(rows[1]);

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(rows[0]);

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(rows[rows.length - 1]);

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(rows[0]);
  });
});
