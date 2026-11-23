import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StreamsLoading } from "./StreamsLoading";
// Adjust this import to the real resolved-rows component/props.
import { StreamsListPanel } from "./Streams/StreamsListPanel";

// Documented budget: this is the acceptance criterion "CLS stays within a
// documented budget." Google's "good" CLS threshold is 0.1; we use a tighter
// budget for a single component since the rest of the page contributes 0.
const CLS_BUDGET = 0.05;

const mockStreams = [
  { id: "1", name: "Stream A", amount: "100", status: "active" },
  { id: "2", name: "Stream B", amount: "250", status: "paused" },
  { id: "3", name: "Stream C", amount: "50", status: "active" },
]; // adjust fields to the real Stream type

function rowHeights(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-testid='stream-row']")).map(
    (el) => el.getBoundingClientRect().height,
  );
}

describe("StreamsLoading -> resolved: layout shift", () => {
  it("placeholder rows match the resolved row height exactly", () => {
    const loading = render(<StreamsLoading rowCount={mockStreams.length} />);
    const loadingHeights = rowHeights(loading.container);
    loading.unmount();

    const resolved = render(<StreamsListPanel streams={mockStreams} isLoading={false} />);
    const resolvedHeights = rowHeights(resolved.container);

    expect(loadingHeights.length).toBeGreaterThan(0);
    expect(loadingHeights.length).toBe(resolvedHeights.length);
    loadingHeights.forEach((h, i) => {
      expect(h).toBeCloseTo(resolvedHeights[i], 0); // 0 = must match to the pixel
    });
  });

  it("cumulative layout shift from placeholder to resolved stays within budget", () => {
    // CLS = impact fraction * distance fraction, summed per shifted element.
    // In a single-column list, a height mismatch on row i shifts every row
    // below it by the same delta, so we compute it directly from heights
    // rather than depending on a browser's real CLS observer (not available
    // in jsdom).
    const loading = render(<StreamsLoading rowCount={mockStreams.length} />);
    const loadingHeights = rowHeights(loading.container);
    const viewportHeight = 800; // typical viewport used for this budget calc
    loading.unmount();

    const resolved = render(<StreamsListPanel streams={mockStreams} isLoading={false} />);
    const resolvedHeights = rowHeights(resolved.container);

    let cls = 0;
    let cumulativeShift = 0;
    for (let i = 0; i < resolvedHeights.length; i++) {
      const before = loadingHeights[i] ?? 0;
      const after = resolvedHeights[i];
      const delta = Math.abs(after - before);
      if (delta === 0) continue;
      cumulativeShift += delta;
      const impactFraction = after / viewportHeight;
      const distanceFraction = delta / viewportHeight;
      cls += impactFraction * distanceFraction;
    }

    expect(cls).toBeLessThanOrEqual(CLS_BUDGET);
  });

  it("container height is stable across both states (no collapse/expand)", () => {
    const loading = render(<StreamsLoading rowCount={mockStreams.length} />);
    const loadingHeight = loading.container.firstElementChild?.getBoundingClientRect().height ?? 0;
    loading.unmount();

    const resolved = render(<StreamsListPanel streams={mockStreams} isLoading={false} />);
    const resolvedHeight = resolved.container.firstElementChild?.getBoundingClientRect().height ?? 0;

    expect(Math.abs(resolvedHeight - loadingHeight)).toBeLessThanOrEqual(1); // 1px rounding tolerance
  });
});