import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StreamTimeline } from "../StreamTimeline";

// ── helpers ────────────────────────────────────────────────────────────────

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mq = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.add(fn);
    }),
    removeEventListener: vi.fn((_: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.delete(fn);
    }),
    dispatchChange(next: boolean) {
      (mq as any).matches = next;
      listeners.forEach((fn) => fn({ matches: next } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mq),
  });
  return mq;
}

const BASE = {
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-04-10T00:00:00Z", // 100 days later
  withdrawableAmount: 500,
  totalAmount: 1000,
  status: "active" as const,
};

// ── segment position tests ─────────────────────────────────────────────────

describe("StreamTimeline segment rendering", () => {
  afterEach(() => vi.restoreAllMocks());

  it("renders the accrual segment for progress past the cliff", () => {
    mockMatchMedia(false);
    // start=Jan 1, cliff=Jan 11 (10%), current=Jan 21 (20%), end=Apr 10 (100%)
    render(
      <StreamTimeline
        {...BASE}
        cliffDate="2024-01-11T00:00:00Z"
        currentDate="2024-01-21T00:00:00Z"
      />,
    );

    const accrual = document.querySelector(
      ".stream-timeline-bar__segment--accrual",
    ) as HTMLElement;
    expect(accrual).not.toBeNull();
    // accrualPercent ≈ 20, cliffPercent ≈ 10, so accrual width ≈ 10%
    const widthFloat = parseFloat(accrual.style.width);
    expect(widthFloat).toBeGreaterThan(8);
    expect(widthFloat).toBeLessThan(12);
  });

  it("renders the cliff segment with correct relative width", () => {
    mockMatchMedia(false);
    // cliff = 25 days into a 100-day stream → 25%
    render(
      <StreamTimeline
        {...BASE}
        cliffDate="2024-01-26T00:00:00Z"
        currentDate="2024-01-26T00:00:00Z"
      />,
    );

    const cliff = document.querySelector(
      ".stream-timeline-bar__segment--cliff",
    ) as HTMLElement;
    expect(cliff).not.toBeNull();
    const widthFloat = parseFloat(cliff.style.width);
    expect(widthFloat).toBeGreaterThan(23);
    expect(widthFloat).toBeLessThan(27);
  });

  it("renders the remaining segment when the stream is not complete", () => {
    mockMatchMedia(false);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-01-11T00:00:00Z" // 10% through
      />,
    );

    const remaining = document.querySelector(
      ".stream-timeline-bar__segment--remaining",
    ) as HTMLElement;
    expect(remaining).not.toBeNull();
    const widthFloat = parseFloat(remaining.style.width);
    expect(widthFloat).toBeGreaterThan(88);
    expect(widthFloat).toBeLessThan(92);
  });

  it("does not render remaining segment when accrual reaches 100%", () => {
    mockMatchMedia(false);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-04-10T00:00:00Z" // exactly at end
      />,
    );

    const remaining = document.querySelector(
      ".stream-timeline-bar__segment--remaining",
    );
    expect(remaining).toBeNull();
  });
});

// ── progress indicator tests ───────────────────────────────────────────────

describe("StreamTimeline progress indicator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sets aria-valuenow to the rounded accrual percentage", () => {
    mockMatchMedia(false);
    // current = 50 days into 100-day stream → 50%
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-02-20T00:00:00Z"
      />,
    );

    const bar = screen.getByRole("progressbar");
    const value = parseInt(bar.getAttribute("aria-valuenow") ?? "-1", 10);
    expect(value).toBeGreaterThanOrEqual(49);
    expect(value).toBeLessThanOrEqual(51);
  });

  it("renders the current-date marker when current is between start and end", () => {
    mockMatchMedia(false);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-02-20T00:00:00Z"
      />,
    );

    const marker = document.querySelector(".stream-timeline-bar__marker");
    expect(marker).not.toBeNull();
  });

  it("omits the current-date marker when current equals end", () => {
    mockMatchMedia(false);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-04-10T00:00:00Z"
      />,
    );

    const marker = document.querySelector(".stream-timeline-bar__marker");
    expect(marker).toBeNull();
  });
});

// ── reduced-motion path ────────────────────────────────────────────────────

describe("StreamTimeline reduced-motion path", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sets data-reduced-motion=true when OS prefers reduced motion", () => {
    mockMatchMedia(true);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-02-20T00:00:00Z"
      />,
    );

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("data-reduced-motion")).toBe("true");
  });

  it("sets data-reduced-motion=false when OS does not prefer reduced motion", () => {
    mockMatchMedia(false);
    render(
      <StreamTimeline
        {...BASE}
        cliffDate={null}
        currentDate="2024-02-20T00:00:00Z"
      />,
    );

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("data-reduced-motion")).toBe("false");
  });
});
