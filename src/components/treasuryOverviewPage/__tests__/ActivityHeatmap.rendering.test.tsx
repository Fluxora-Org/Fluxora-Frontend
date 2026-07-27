/**
 * ActivityHeatmap — deterministic rendering and stability regression suite
 *
 * Issue #1152: Stabilize treasury heatmap rendering
 *
 * This file makes the heatmap rendering deterministic across refreshes and
 * re-renders by pinning every case that could vary across invocations:
 *
 *   1.  Date-window is stable: the same 84-cell range renders on a second
 *       render call in the same JS tick (no Date.now() drift between renders).
 *   2.  DST boundaries: advancing the clock through a DST transition does not
 *       produce duplicate, missing, or wrongly-labelled day cells.
 *   3.  Re-render with new `streams` prop does NOT change the rendered cells
 *       for dates that had no change, and DOES update cells that did change.
 *   4.  Re-render with the same props produces an identical DOM (stable keys).
 *   5.  localStorage tampered value ('table123') is ignored; heatmap mode is
 *       the fallback, matching the in-code validation guard.
 *   6.  Rapid toggle back-and-forth between heatmap ↔ table lands in the
 *       expected final state and writes the correct value to localStorage.
 *   7.  loading → loaded transition: going from loading=true to loading=false
 *       replaces skeleton cells with real interactive cells.
 *   8.  error → cleared transition: going from error to no-error renders the
 *       heatmap grid, not the error node.
 *   9.  streams prop update from [] to populated: tone updates from
 *       'no-activity' to 'sparse'/'dense' without a full unmount.
 *   10. startDate with a time component (ISO 8601 datetime string) is bucketed
 *       to the date part only (i.e. "T" suffix is stripped correctly).
 *   11. Streams that fall outside the 84-day window are not counted (no phantom
 *       cells or inflated event counts).
 *   12. The toggle button is always present in both loading-false states
 *       (heatmap and table) and is disabled in the loading state.
 *   13. Cell count is always exactly 84, regardless of whether today is
 *       mid-week or a Sunday.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ActivityHeatmap, { getActivityTone } from "../../treasuryOverviewPage/ActivityHeatmap";
import type { Stream } from "../../treasuryOverviewPage/Stream";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a minimal Stream with a given startDate. */
function makeStream(id: string, startDate: string): Stream {
  return { id, name: id, recipient: "addr", rate: "1", status: "Active", startDate };
}

// ─── Shared test clock ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  // Wednesday, 2026-07-22 — mid-week reference point
  vi.setSystemTime(new Date("2026-07-22T12:00:00Z"));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── 1. Date-window stability across renders ──────────────────────────────────

describe("ActivityHeatmap — date-window determinism", () => {
  it("produces the same 84 aria-labels on a second synchronous render", () => {
    const { container: c1 } = render(<ActivityHeatmap streams={[]} />);
    const labels1 = Array.from(
      c1.querySelectorAll(".heatmap-cell[aria-label]"),
    ).map((el) => el.getAttribute("aria-label"));

    const { container: c2 } = render(<ActivityHeatmap streams={[]} />);
    const labels2 = Array.from(
      c2.querySelectorAll(".heatmap-cell[aria-label]"),
    ).map((el) => el.getAttribute("aria-label"));

    expect(labels1).toEqual(labels2);
  });

  it("always renders exactly 84 cells on any day of the week", () => {
    // Test Sun through Sat (0–6).
    const days = [
      "2026-07-19T12:00:00Z", // Sun
      "2026-07-20T12:00:00Z", // Mon
      "2026-07-21T12:00:00Z", // Tue
      "2026-07-22T12:00:00Z", // Wed
      "2026-07-23T12:00:00Z", // Thu
      "2026-07-24T12:00:00Z", // Fri
      "2026-07-25T12:00:00Z", // Sat
    ];
    for (const day of days) {
      vi.setSystemTime(new Date(day));
      const { container } = render(<ActivityHeatmap streams={[]} />);
      const cells = container.querySelectorAll(".heatmap-grid .heatmap-cell");
      expect(cells.length).toBe(84);
    }
  });

  it("the last cell always corresponds to the Sunday ending the current week", () => {
    // Today is Wednesday 2026-07-22. End of week (Sunday) = 2026-07-26.
    const { container } = render(<ActivityHeatmap streams={[]} />);
    const cells = container.querySelectorAll(
      ".heatmap-visual-wrapper .heatmap-grid .heatmap-cell",
    );
    const lastLabel = cells[cells.length - 1]?.getAttribute("aria-label");
    expect(lastLabel).toContain("2026-07-26");
  });

  it("the first cell is always exactly 83 days before the ending Sunday", () => {
    const { container } = render(<ActivityHeatmap streams={[]} />);
    const cells = container.querySelectorAll(
      ".heatmap-visual-wrapper .heatmap-grid .heatmap-cell",
    );
    const firstLabel = cells[0]?.getAttribute("aria-label") ?? "";
    // End = 2026-07-26. Start = 2026-07-26 - 83 = 2026-05-04.
    expect(firstLabel).toContain("2026-05-04");
  });
});

// ─── 2. DST boundary stability ────────────────────────────────────────────────

describe("ActivityHeatmap — DST boundary stability", () => {
  it("renders exactly 84 distinct dates around a spring-forward boundary (US/Eastern)", () => {
    // US Eastern spring-forward: 2026-03-08 02:00 → 03:00.
    // Set today to 2026-03-09 so the 12-week window straddles the boundary.
    vi.setSystemTime(new Date("2026-03-09T12:00:00Z"));

    const { container } = render(<ActivityHeatmap streams={[]} />);
    const cells = container.querySelectorAll(
      ".heatmap-visual-wrapper .heatmap-grid .heatmap-cell",
    );
    expect(cells.length).toBe(84);

    // All labels must be unique (no duplicate dates due to DST).
    const labels = Array.from(cells).map((c) => c.getAttribute("aria-label") ?? "");
    const uniqueDates = new Set(labels.map((l) => l.split(":")[0].trim()));
    expect(uniqueDates.size).toBe(84);
  });

  it("renders exactly 84 distinct dates around a fall-back boundary (US/Eastern)", () => {
    // US Eastern fall-back: 2026-11-01 02:00 → 01:00.
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));

    const { container } = render(<ActivityHeatmap streams={[]} />);
    const cells = container.querySelectorAll(
      ".heatmap-visual-wrapper .heatmap-grid .heatmap-cell",
    );
    expect(cells.length).toBe(84);

    const labels = Array.from(cells).map((c) => c.getAttribute("aria-label") ?? "");
    const uniqueDates = new Set(labels.map((l) => l.split(":")[0].trim()));
    expect(uniqueDates.size).toBe(84);
  });
});

// ─── 3. Re-render stability ───────────────────────────────────────────────────

describe("ActivityHeatmap — re-render stability", () => {
  it("re-render with identical streams leaves all cell classes unchanged", () => {
    const streams = [makeStream("s1", "2026-07-20")];
    const { container, rerender } = render(
      <ActivityHeatmap streams={streams} />,
    );
    const before = Array.from(
      container.querySelectorAll(".heatmap-cell"),
    ).map((el) => el.className);

    rerender(<ActivityHeatmap streams={streams} />);

    const after = Array.from(
      container.querySelectorAll(".heatmap-cell"),
    ).map((el) => el.className);

    expect(after).toEqual(before);
  });

  it("re-render with additional stream updates only the relevant cell", () => {
    const { rerender } = render(
      <ActivityHeatmap streams={[makeStream("s1", "2026-07-20")]} />,
    );

    // 2026-07-19 should start as no-activity.
    const cell19Before = screen.getByLabelText("2026-07-19: no activity");
    expect(cell19Before.className).toContain("level-0");

    // Add a stream on 2026-07-19 and re-render.
    rerender(
      <ActivityHeatmap
        streams={[
          makeStream("s1", "2026-07-20"),
          makeStream("s2", "2026-07-19"),
        ]}
      />,
    );

    const cell19After = screen.getByLabelText("2026-07-19: 1 stream event");
    expect(cell19After.className).toContain("level-1");

    // 2026-07-20 should be unchanged.
    expect(screen.getByLabelText("2026-07-20: 1 stream event")).toBeInTheDocument();
  });

  it("streams prop update from [] → populated updates data-activity-tone without unmount", () => {
    const { container, rerender } = render(<ActivityHeatmap streams={[]} />);
    const root = container.querySelector(".activity-heatmap-container");
    expect(root).toHaveAttribute("data-activity-tone", "no-activity");

    rerender(<ActivityHeatmap streams={[makeStream("s1", "2026-07-20")]} />);
    expect(root).toHaveAttribute("data-activity-tone", "sparse");
  });
});

// ─── 4. localStorage guards ───────────────────────────────────────────────────

describe("ActivityHeatmap — localStorage guards", () => {
  it("ignores a tampered localStorage value and defaults to heatmap mode", () => {
    localStorage.setItem("fluxora:treasury:heatmap-view", "table123");
    const { container } = render(<ActivityHeatmap streams={[]} />);
    // The invalid value is rejected; heatmap grid renders by default.
    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
    expect(container.querySelector(".heatmap-table")).not.toBeInTheDocument();
  });

  it("ignores an injected XSS-attempt value in localStorage", () => {
    localStorage.setItem(
      "fluxora:treasury:heatmap-view",
      "<script>alert(1)</script>",
    );
    const { container } = render(<ActivityHeatmap streams={[]} />);
    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
  });

  it("rapid toggle (heatmap → table → heatmap) writes the final state to localStorage", () => {
    const { container } = render(<ActivityHeatmap streams={[]} />);
    const btn = screen.getByRole("button", { name: "View as table" });

    fireEvent.click(btn); // → table
    fireEvent.click(screen.getByRole("button", { name: "View as heatmap" })); // → heatmap

    expect(localStorage.getItem("fluxora:treasury:heatmap-view")).toBe("heatmap");
    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
  });
});

// ─── 5. State transitions ─────────────────────────────────────────────────────

describe("ActivityHeatmap — state transitions", () => {
  it("loading → loaded: skeleton cells replaced by real interactive cells", () => {
    const { container, rerender } = render(
      <ActivityHeatmap streams={[]} loading={true} />,
    );
    expect(container.querySelectorAll(".skeleton-pulse").length).toBe(84);

    rerender(<ActivityHeatmap streams={[makeStream("s1", "2026-07-20")]} loading={false} />);

    expect(container.querySelectorAll(".skeleton-pulse").length).toBe(0);
    const cells = container.querySelectorAll(".heatmap-visual-wrapper .heatmap-cell");
    expect(cells.length).toBe(84);
    // The real cells are not disabled.
    cells.forEach((c) => expect(c.hasAttribute("disabled")).toBe(false));
  });

  it("error → cleared: going from error=string to error=null renders the heatmap", () => {
    const { container, rerender } = render(
      <ActivityHeatmap streams={[]} error="oops" />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(container.querySelector(".heatmap-grid")).not.toBeInTheDocument();

    rerender(<ActivityHeatmap streams={[]} error={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector(".heatmap-grid")).toBeInTheDocument();
  });

  it("loading disabled toggle button has no click handler and stays inert", () => {
    render(<ActivityHeatmap streams={[]} loading={true} />);
    const btn = screen.getByRole("button", { name: "View as table" });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    // View mode should not change after clicking a disabled button.
    expect(screen.queryByRole("button", { name: "View as heatmap" })).not.toBeInTheDocument();
  });
});

// ─── 6. startDate edge cases ──────────────────────────────────────────────────

describe("ActivityHeatmap — startDate edge cases", () => {
  it("ISO datetime startDate is bucketed to its date part", () => {
    const stream = makeStream("s1", "2026-07-20T14:30:00Z");
    render(<ActivityHeatmap streams={[stream]} />);
    expect(
      screen.getByLabelText("2026-07-20: 1 stream event"),
    ).toBeInTheDocument();
  });

  it("streams outside the 84-day window are not counted", () => {
    // Far future and far past — both outside the trailing 12-week window.
    const streams = [
      makeStream("future", "2030-01-01"),
      makeStream("past", "2020-01-01"),
    ];
    render(<ActivityHeatmap streams={streams} />);
    const activeCells = screen.queryAllByLabelText(/: \d+ stream event/);
    expect(activeCells.length).toBe(0);
  });

  it("multiple streams on the same day sum correctly", () => {
    const streams = [
      makeStream("a", "2026-07-20"),
      makeStream("b", "2026-07-20"),
      makeStream("c", "2026-07-20"),
    ];
    render(<ActivityHeatmap streams={streams} />);
    expect(screen.getByLabelText("2026-07-20: 3 stream events")).toBeInTheDocument();
  });
});

// ─── 7. getActivityTone determinism ───────────────────────────────────────────

describe("getActivityTone — deterministic classification", () => {
  it("returns identical results for the same inputs called multiple times", () => {
    const counts = { "2026-07-20": 5, "2026-07-19": 1 };
    const r1 = getActivityTone(counts);
    const r2 = getActivityTone(counts);
    const r3 = getActivityTone(counts);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it("does not mutate the input counts object", () => {
    const counts = { "2026-07-20": 5 };
    const original = JSON.stringify(counts);
    getActivityTone(counts);
    expect(JSON.stringify(counts)).toBe(original);
  });

  it("a single day with 3 events (level 2) classifies as sparse", () => {
    expect(getActivityTone({ "2026-07-20": 3 })).toBe("sparse");
  });

  it("a single day with exactly 4 events (level 3) classifies as sparse (1/84 < 0.30)", () => {
    expect(getActivityTone({ "2026-07-20": 4 })).toBe("sparse");
  });
});
