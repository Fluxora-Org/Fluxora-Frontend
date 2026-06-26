import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreamTimeline } from "../StreamTimeline";

type ChangeHandler = (event: MediaQueryListEvent) => void;

function mockReducedMotion(matches: boolean) {
  const listeners: ChangeHandler[] = [];
  const mediaQuery = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_: string, listener: ChangeHandler) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_: string, listener: ChangeHandler) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }),
    addListener: vi.fn((listener: ChangeHandler) => {
      listeners.push(listener);
    }),
    removeListener: vi.fn((listener: ChangeHandler) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }),
  };

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mediaQuery),
  });
}

function renderTimeline(
  props: Partial<ComponentProps<typeof StreamTimeline>> = {},
) {
  return render(
    <StreamTimeline
      startDate="2026-01-01T00:00:00Z"
      cliffDate="2026-01-26T00:00:00Z"
      currentDate="2026-02-20T00:00:00Z"
      endDate="2026-04-11T00:00:00Z"
      withdrawableAmount={500}
      totalAmount={1_000}
      status="active"
      {...props}
    />,
  );
}

describe("StreamTimeline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders cliff, accrual, remaining, and current marker positions", () => {
    mockReducedMotion(false);

    renderTimeline();

    expect(
      screen.getByRole("progressbar", { name: /stream accrual progress/i }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("img", { name: /cliff period/i })).toHaveStyle({
      width: "25%",
    });
    expect(screen.getByRole("img", { name: /accrual period/i })).toHaveStyle({
      width: "25%",
    });
    expect(screen.getByRole("img", { name: /remaining period/i })).toHaveStyle({
      width: "50%",
    });
    expect(screen.getByRole("img", { name: /current date/i })).toHaveStyle({
      left: "50%",
    });
  });

  it("keeps accrual hidden until progress passes the cliff", () => {
    mockReducedMotion(false);

    renderTimeline({
      currentDate: "2026-01-11T00:00:00Z",
    });

    expect(
      screen.getByRole("progressbar", { name: /stream accrual progress/i }),
    ).toHaveAttribute("aria-valuenow", "10");
    expect(
      screen.queryByRole("img", { name: /accrual period/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /remaining period/i })).toHaveStyle({
      width: "90%",
    });
  });

  it("caps completed timelines at 100 percent and hides remaining state", () => {
    mockReducedMotion(false);

    renderTimeline({
      currentDate: "2026-04-20T00:00:00Z",
      status: "completed",
    });

    expect(
      screen.getByRole("progressbar", { name: /stream accrual progress/i }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.queryByRole("img", { name: /remaining period/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /current date/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes the reduced-motion rendering path", () => {
    mockReducedMotion(true);

    renderTimeline();

    expect(
      screen.getByRole("region", { name: /stream timeline visualization/i }),
    ).toHaveAttribute("data-reduced-motion", "true");
  });

  it("handles start, cliff, and end on the same instant without NaN styles", () => {
    mockReducedMotion(false);

    const { container } = renderTimeline({
      startDate: "2026-01-01T00:00:00Z",
      cliffDate: "2026-01-01T00:00:00Z",
      currentDate: "2026-01-01T00:00:00Z",
      endDate: "2026-01-01T00:00:00Z",
    });

    expect(
      screen.getByRole("progressbar", { name: /stream accrual progress/i }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(
      screen.queryByRole("img", { name: /cliff period/i }),
    ).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("NaN");
  });
});
