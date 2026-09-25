import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import Metrics from "../Metrics";
import { treasuryDemoMetrics } from "../../../fixtures/treasury";

describe("Metrics", () => {
  it("renders every treasury metric label and value", () => {
    render(<Metrics metrics={treasuryDemoMetrics} />);

    for (const metric of treasuryDemoMetrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    }
  });

  it("renders an empty state when no metrics are available", () => {
    render(<Metrics metrics={[]} />);

    expect(
      screen.getByText("No treasury metrics available."),
    ).toBeInTheDocument();
  });

  it("renders a loading status when loading=true", () => {
    render(<Metrics metrics={[]} loading={true} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading treasury metrics...",
    );
  });

  it("renders an error alert when error is set", () => {
    render(<Metrics metrics={[]} error="Something went wrong" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("loading takes precedence over error", () => {
    render(<Metrics metrics={[]} loading={true} error="oops" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

   it("has the metrics-grid-container class on the section for container-query reflow", () => {
    render(<Metrics metrics={treasuryDemoMetrics} />);

    const sectionEl = screen.getByRole("region", { name: /Treasury metrics/i });
    expect(sectionEl).toHaveClass("metrics-grid-container");
  });

  it("every metric card has overflow-safe styles for 400%-zoom reflow", () => {
    render(<Metrics metrics={treasuryDemoMetrics} />);

    const cards = screen.getAllByRole("group");
    expect(cards.length).toBe(treasuryDemoMetrics.length);

    cards.forEach((card) => {
      const style = card.getAttribute("style") || "";
      expect(style).toContain("var(--color-surface-default)");
      expect(style).toContain("min-width");
      expect(style).toContain("overflow");
    });
  });

  describe("locale resilience", () => {
    afterEach(() => {
      Object.defineProperty(navigator, "language", {
        value: "en-US",
        configurable: true,
      });
    });

    function setMockLocale(locale: string) {
      Object.defineProperty(navigator, "language", {
        value: locale,
        configurable: true,
        writable: true,
      });
    }

    const localeCases = [
      { name: "ar-EG", locale: "ar-EG" },
      { name: "zh-Hans-CN", locale: "zh-Hans-CN" },
      { name: "malformed locale", locale: "not-a-valid-locale!" },
    ];

    for (const { name, locale } of localeCases) {
      it(`renders all metric labels without crashing when navigator.language is ${name}`, () => {
        setMockLocale(locale);
        render(<Metrics metrics={treasuryDemoMetrics} />);

        for (const metric of treasuryDemoMetrics) {
          expect(screen.getByText(metric.label)).toBeInTheDocument();
          expect(screen.getByText(metric.value)).toBeInTheDocument();
        }
      });
    }
  });

  describe("design token styling (no hardcoded Tailwind color classes)", () => {
    it("uses var(--color-text-secondary) for loading state and does not use hardcoded color classes", () => {
      render(<Metrics metrics={[]} loading={true} />);
      const statusEl = screen.getByRole("status");

      expect(statusEl).toHaveStyle({ color: "var(--color-text-secondary)" });
      expect(statusEl.className).not.toMatch(/text-gray-500|text-red-600/);
    });

    it("uses var(--color-danger) for error state and does not use hardcoded color classes", () => {
      render(<Metrics metrics={[]} error="Failed to fetch metrics" />);
      const alertEl = screen.getByRole("alert");

      expect(alertEl).toHaveStyle({ color: "var(--color-danger)" });
      expect(alertEl.className).not.toMatch(/text-gray-500|text-red-600/);
    });

    it("uses var(--color-text-secondary) for empty state and does not use hardcoded color classes", () => {
      render(<Metrics metrics={[]} />);
      const emptyEl = screen.getByText("No treasury metrics available.");

      expect(emptyEl).toHaveStyle({ color: "var(--color-text-secondary)" });
      expect(emptyEl.className).not.toMatch(/text-gray-500|text-red-600/);
    });
  });

  describe("getGridCols keyboard reorder — breakpoint correctness", () => {
    // jsdom does not implement matchMedia, so window.matchMedia always returns
    // `matches: false`, meaning `isMobile` stays false and the keyboard-move
    // menu is rendered at every viewport width.  That lets us exercise
    // getGridCols() at arbitrary innerWidth values in tests.

    let originalInnerWidth: number;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
    });

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        value: originalInnerWidth,
        configurable: true,
        writable: true,
      });
    });

    function setViewportWidth(width: number) {
      Object.defineProperty(window, "innerWidth", {
        value: width,
        configurable: true,
        writable: true,
      });
    }

    it("moves to the immediately next widget (index + 1) when viewport is below 640 px (1-column layout)", async () => {
      // Regression: before the fix, getGridCols() returned 2 below 640 px,
      // causing "Move Down" to skip over one widget (targetIdx = idx + 2).
      setViewportWidth(375);

      const user = userEvent.setup();
      render(<Metrics metrics={treasuryDemoMetrics} />);

      // Open the move-menu on the first widget ("Active Streams")
      const [firstMoveBtn] = screen.getAllByRole("button", { name: "Move Active Streams widget" });
      await user.click(firstMoveBtn);

      // The "Move Down" menu item should now be enabled (idx 0 + 1 < 3)
      const moveDownItem = screen.getByRole("menuitem", { name: "Move Down" });
      expect(moveDownItem).not.toBeDisabled();

      await user.click(moveDownItem);

      // After the move, the aria-live region must announce position 2 of 3
      // (targetIdx = 0 + 1 = 1  →  "position 2 of 3").
      // With the old bug it would announce position 3 of 3 (targetIdx = 0 + 2 = 2).
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("Active Streams moved to position 2 of 3");
    });

    it("moves two positions down when viewport is in the sm range (640–1023 px, 2-column layout)", async () => {
      setViewportWidth(768);

      const user = userEvent.setup();
      render(<Metrics metrics={treasuryDemoMetrics} />);

      const [firstMoveBtn] = screen.getAllByRole("button", { name: "Move Active Streams widget" });
      await user.click(firstMoveBtn);

      const moveDownItem = screen.getByRole("menuitem", { name: "Move Down" });
      expect(moveDownItem).not.toBeDisabled();

      await user.click(moveDownItem);

      // targetIdx = 0 + 2 = 2  →  "position 3 of 3"
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("Active Streams moved to position 3 of 3");
    });

    it("moves three positions down when viewport is at lg (≥ 1024 px, 3-column layout)", async () => {
      setViewportWidth(1280);

      const user = userEvent.setup();
      // Use only 3 metrics — first widget has no widget in row below at idx 0
      // with only 3 items in a 3-col grid so "Move Down" is disabled.
      // Use a 4th dummy metric to make the down-move possible.
      const fourMetrics = [
        ...treasuryDemoMetrics,
        { icon: "💰", label: "Bonus", value: "99", desc: "extra" },
      ];
      render(<Metrics metrics={fourMetrics} />);

      const [firstMoveBtn] = screen.getAllByRole("button", { name: "Move Active Streams widget" });
      await user.click(firstMoveBtn);

      const moveDownItem = screen.getByRole("menuitem", { name: "Move Down" });
      expect(moveDownItem).not.toBeDisabled();

      await user.click(moveDownItem);

      // targetIdx = 0 + 3 = 3  →  "position 4 of 4"
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("Active Streams moved to position 4 of 4");
    });
  });
});
