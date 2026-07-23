import { render, screen } from "@testing-library/react";
import { describe, expect, it, afterEach } from "vitest";
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
});
