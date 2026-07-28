/**
 * StreamCompare.test.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests for the Stream Detail Split Compare feature:
 *   - Multi-select checkboxes in StreamsTable
 *   - Compare button enable/disable logic
 *   - Clear selection
 *   - onCompare callback fires with correct IDs
 *   - StreamComparePane renders two panes with correct stream data
 *   - Swap panes control
 *   - Remove / exit compare controls
 *   - Keyboard accessibility: checkbox reachable, row nav unaffected
 */

import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as streamsService from "../../lib/api/streamsService";
import StreamsTable from "../../components/treasuryOverviewPage/StreamsTable";
import StreamComparePane from "../../components/StreamComparePane";
import type { Stream } from "../../components/treasuryOverviewPage/Stream";
import type { StreamRecord } from "../../data/streamRecords";

// ── Mock ──────────────────────────────────────────────────────────────────────

vi.mock("../../lib/api/streamsService");

// ── Fixtures ──────────────────────────────────────────────────────────────────

const streamA: Stream = {
  id: "STR-001",
  name: "Alpha Grant",
  recipient: "GABC...1111",
  rate: "5,000 USDC/mo",
  accruedAmount: 12000,
  status: "Active",
};

const streamB: Stream = {
  id: "STR-002",
  name: "Beta Grant",
  recipient: "GXYZ...2222",
  rate: "2,500 USDC/mo",
  accruedAmount: 6000,
  status: "Paused",
};

const streamC: Stream = {
  id: "STR-003",
  name: "Gamma Grant",
  recipient: "GDEF...3333",
  rate: "1,000 USDC/mo",
  status: "Completed",
};

const sampleStreams = [streamA, streamB, streamC];

const recordA: StreamRecord = {
  id: "STR-001",
  name: "Alpha Grant",
  recipientName: "Alice",
  recipientAddress: "GABC1111",
  treasuryName: "Treasury",
  treasuryAddress: "GTREASURY",
  asset: "USDC",
  status: "Active",
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 12000,
  withdrawableAmount: 3000,
  remainingAmount: 36000,
  progress: 25,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  cliffDate: "2024-03-01",
  summary: "Alpha stream summary",
  health: "Healthy",
  healthNote: "On track",
  auditNote: "No issues",
  tags: ["grant"],
  timeline: [],
};

const recordB: StreamRecord = {
  id: "STR-002",
  name: "Beta Grant",
  recipientName: "Bob",
  recipientAddress: "GXYZ2222",
  treasuryName: "Treasury",
  treasuryAddress: "GTREASURY",
  asset: "USDC",
  status: "Paused",    // differs
  monthlyRate: 2500,   // differs
  depositAmount: 24000,
  streamedAmount: 6000,
  withdrawableAmount: 1500,
  remainingAmount: 18000,
  progress: 25,
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  summary: "Beta stream summary",
  health: "Attention", // differs
  healthNote: "Paused by sender",
  auditNote: "",
  tags: ["grant"],
  timeline: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderTable(onCompare?: (a: string, b: string) => void) {
  return render(
    <MemoryRouter>
      <StreamsTable streams={sampleStreams} onCompare={onCompare} />
    </MemoryRouter>,
  );
}

function renderComparePane(
  leftId = "STR-001",
  rightId = "STR-002",
  onExit = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <StreamComparePane leftId={leftId} rightId={rightId} onExit={onExit} />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StreamsTable — multi-select and compare entry point
// ─────────────────────────────────────────────────────────────────────────────

describe("StreamsTable — multi-select compare entry", () => {
  it("renders a checkbox for every data row", () => {
    renderTable();
    expect(screen.getAllByRole("checkbox")).toHaveLength(sampleStreams.length);
  });

  it("does not show the compare action bar initially", () => {
    renderTable();
    expect(
      screen.queryByRole("region", { name: "Compare selection" }),
    ).not.toBeInTheDocument();
  });

  it("shows bar and disabled Compare button after one stream is checked", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(
      screen.getByRole("checkbox", { name: /Select Alpha Grant/i }),
    );

    const bar = screen.getByRole("region", { name: "Compare selection" });
    expect(bar).toHaveTextContent("1 stream selected");
    expect(
      screen.getByRole("button", { name: /Compare streams/i }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("enables Compare button when two streams are checked", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Beta Grant/i }));

    expect(
      screen.getByRole("button", { name: /Compare streams/i }),
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("region", { name: "Compare selection" }),
    ).toHaveTextContent("2 streams selected");
  });

  it("calls onCompare with the two selected IDs when Compare is clicked", async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();
    renderTable(onCompare);

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Beta Grant/i }));
    await user.click(screen.getByRole("button", { name: /Compare streams/i }));

    expect(onCompare).toHaveBeenCalledOnce();
    expect(onCompare).toHaveBeenCalledWith("STR-001", "STR-002");
  });

  it("unchecking a stream updates the count and re-disables Compare", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Beta Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i })); // uncheck

    expect(
      screen.getByRole("region", { name: "Compare selection" }),
    ).toHaveTextContent("1 stream selected");
    expect(
      screen.getByRole("button", { name: /Compare streams/i }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("drops the oldest selection when a third stream is checked", async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();
    renderTable(onCompare);

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Beta Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Gamma Grant/i }));
    await user.click(screen.getByRole("button", { name: /Compare streams/i }));

    // STR-001 was the oldest and is replaced; remaining pair is STR-002, STR-003
    expect(onCompare).toHaveBeenCalledWith("STR-002", "STR-003");
  });

  it("clears all selections when Clear is clicked", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    await user.click(screen.getByRole("checkbox", { name: /Select Beta Grant/i }));
    await user.click(
      screen.getByRole("button", { name: /Clear compare selection/i }),
    );

    expect(
      screen.queryByRole("region", { name: "Compare selection" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /Select Alpha Grant/i }),
    ).not.toBeChecked();
  });

  it("preserves sort direction after checking compare rows", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("button", { name: "STREAM" }));
    await user.click(screen.getByRole("button", { name: "STREAM" }));
    expect(
      screen.getByRole("columnheader", { name: "STREAM" }),
    ).toHaveAttribute("aria-sort", "descending");

    await user.click(screen.getByRole("checkbox", { name: /Select Alpha Grant/i }));
    expect(
      screen.getByRole("columnheader", { name: "STREAM" }),
    ).toHaveAttribute("aria-sort", "descending");
  });

  it("checkbox can be toggled with the Space key when focused", async () => {
    const user = userEvent.setup();
    renderTable();

    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    firstCheckbox.focus();
    await user.keyboard(" ");
    expect(firstCheckbox).toBeChecked();
  });

  it("grid has aria-multiselectable", () => {
    renderTable();
    expect(
      screen.getByRole("grid", { name: "Active streams" }),
    ).toHaveAttribute("aria-multiselectable", "true");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// StreamComparePane — layout, data, swap, remove
// ─────────────────────────────────────────────────────────────────────────────

describe("StreamComparePane", () => {
  beforeEach(() => {
    vi.mocked(streamsService.getStreamById).mockImplementation((id: string) => {
      if (id === "STR-001") return Promise.resolve(recordA);
      if (id === "STR-002") return Promise.resolve(recordB);
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a compare region with Pane A and Pane B labels", () => {
    renderComparePane();
    expect(
      screen.getByRole("region", { name: "Stream comparison" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pane A")).toBeInTheDocument();
    expect(screen.getByText("Pane B")).toBeInTheDocument();
  });

  it("loads and displays stream names in both panes", async () => {
    renderComparePane();
    await waitFor(() => {
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument();
      expect(screen.getByText("Beta Grant")).toBeInTheDocument();
    });
  });

  it("shows health badges once data resolves", async () => {
    renderComparePane();
    await waitFor(() => {
      expect(screen.getAllByText(/Healthy/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Attention/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows a diff count badge when fields differ between panes", async () => {
    renderComparePane();
    await waitFor(() => {
      expect(screen.getByText(/difference/i)).toBeInTheDocument();
    });
  });

  it("swap button reverses pane stream assignments", async () => {
    const user = userEvent.setup();
    renderComparePane();

    await waitFor(() => {
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument();
    });

    // Before: Pane A → Alpha Grant
    expect(
      within(screen.getByText("Pane A").closest("section")!).getByText(
        "Alpha Grant",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Swap left and right panes/i }),
    );

    // After: Pane A → Beta Grant
    await waitFor(() => {
      expect(
        within(screen.getByText("Pane A").closest("section")!).getByText(
          "Beta Grant",
        ),
      ).toBeInTheDocument();
    });
  });

  it("exit button calls onExit", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    renderComparePane("STR-001", "STR-002", onExit);

    await user.click(
      screen.getByRole("button", { name: /Exit compare mode/i }),
    );
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("remove button on Pane A removes only that pane without exiting", async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    renderComparePane("STR-001", "STR-002", onExit);

    await waitFor(() =>
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument(),
    );

    const paneASection = screen.getByText("Pane A").closest("section")!;
    await user.click(
      within(paneASection).getByRole("button", { name: /Remove/i }),
    );

    // Pane A should show "Pane removed", Pane B should remain
    await waitFor(() => {
      expect(screen.getByText(/Pane removed/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Pane B")).toBeInTheDocument();
    // onExit should NOT be called — only the pane was removed
    expect(onExit).not.toHaveBeenCalled();
  });

  it("shows loading skeletons while fetch is pending", () => {
    vi.mocked(streamsService.getStreamById).mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    );

    renderComparePane();
    expect(
      screen.getAllByLabelText(/Loading stream/i).length,
    ).toBeGreaterThan(0);
  });

  it("Pane A section is aria-labelled by its heading", async () => {
    renderComparePane();
    await waitFor(() =>
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument(),
    );

    const heading = screen.getByText("Pane A");
    expect(heading.id).toBe("compare-pane-a-heading");
    expect(heading.closest("section")).toHaveAttribute(
      "aria-labelledby",
      "compare-pane-a-heading",
    );
  });

  it("Pane B section is aria-labelled by its heading", async () => {
    renderComparePane();
    await waitFor(() =>
      expect(screen.getByText("Beta Grant")).toBeInTheDocument(),
    );

    const heading = screen.getByText("Pane B");
    expect(heading.id).toBe("compare-pane-b-heading");
    expect(heading.closest("section")).toHaveAttribute(
      "aria-labelledby",
      "compare-pane-b-heading",
    );
  });

  it("both panes render a Timeline section heading after loading", async () => {
    renderComparePane();
    await waitFor(() => {
      expect(screen.getAllByText("Timeline")).toHaveLength(2);
    });
  });

  it("both panes render a StreamTimeline progressbar after loading", async () => {
    renderComparePane();
    await waitFor(() => {
      expect(
        screen.getAllByRole("progressbar", { name: /accrual progress/i }),
      ).toHaveLength(2);
    });
  });

  it("shows not-found empty state for an unknown stream ID", async () => {
    renderComparePane("STR-MISSING", "STR-002");
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it("formats large safe integer amounts via formatAssetAmount instead of toLocaleString", async () => {
    const largeRecordA: StreamRecord = {
      ...recordA,
      monthlyRate: Number.MAX_SAFE_INTEGER,
      depositAmount: Number.MAX_SAFE_INTEGER,
      streamedAmount: Number.MAX_SAFE_INTEGER,
      withdrawableAmount: Number.MAX_SAFE_INTEGER,
      remainingAmount: Number.MAX_SAFE_INTEGER,
    };
    const largeRecordB: StreamRecord = {
      ...recordB,
      id: "STR-002",
      name: "Beta Grant",
      monthlyRate: Number.MAX_SAFE_INTEGER,
      depositAmount: Number.MAX_SAFE_INTEGER,
      streamedAmount: Number.MAX_SAFE_INTEGER,
      withdrawableAmount: Number.MAX_SAFE_INTEGER,
      remainingAmount: Number.MAX_SAFE_INTEGER,
    };
    vi.mocked(streamsService.getStreamById).mockImplementation((id: string) => {
      if (id === "STR-001") return Promise.resolve(largeRecordA);
      if (id === "STR-002") return Promise.resolve(largeRecordB);
      return Promise.resolve(null);
    });

    renderComparePane("STR-001", "STR-002");
    await waitFor(() => {
      expect(screen.getByText("Alpha Grant")).toBeInTheDocument();
    });

    // All five numeric fields should use the shared formatter
    // Both panes show the same large amounts, so we expect at least 8 matches
    const formatted = screen.getAllByText(/9,007,199,254,740,991 USDC/);
    // depositAmount, streamedAmount, withdrawableAmount, remainingAmount = 4 digits-only per pane × 2 panes = 8
    // monthlyRate appends "/mo" so it won't match this pattern → 8 matches
    expect(formatted.length).toBeGreaterThanOrEqual(8);
  });
});
