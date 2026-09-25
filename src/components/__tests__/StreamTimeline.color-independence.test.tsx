import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { StreamTimeline } from "../StreamTimeline";
import {
  ColorBlindSimulationProvider,
  type SimulationMode,
} from "../colorBlindSimulation/ColorBlindSimulationProvider";

const styles = readFileSync("src/components/StreamTimeline.css", "utf8");

const props = {
  startDate: "2026-01-01",
  cliffDate: "2026-01-11",
  currentDate: "2026-01-31",
  endDate: "2026-04-11",
  withdrawableAmount: 200,
  totalAmount: 1000,
  status: "active" as const,
};

describe("StreamTimeline without colour cues", () => {
  it.each(["grayscale", "protanopia", "deuteranopia", "tritanopia"] as const)(
    "renders text and distinct segment patterns under %s",
    (mode) => {
      const { container } = render(
        <ColorBlindSimulationProvider
          initialMode={mode === "grayscale" ? "none" : (mode as SimulationMode)}
        >
          <StreamTimeline {...props} />
        </ColorBlindSimulationProvider>,
      );
      const filterTarget = container.querySelector<HTMLElement>(
        "[data-colorblind-simulation]",
      )!;
      if (mode === "grayscale") filterTarget.style.filter = "grayscale(1)";
      expect(filterTarget.style.filter).toContain(
        mode === "grayscale" ? "grayscale" : `cb-filter-${mode}`,
      );

      const timeline = screen.getByRole("region", {
        name: /stream timeline visualization/i,
      });
      expect(
        within(timeline).getByText(/Vested period: 20%\. Unvested period: 70%/),
      ).toBeVisible();
      expect(within(timeline).getByText("Cliff end")).toBeVisible();
      expect(within(timeline).getByText("End", { exact: true })).toBeVisible();
      expect(
        within(timeline).getByText(/Withdrawable: 200 of 1,000/),
      ).toBeVisible();
      expect(
        within(timeline).getByRole("img", { name: /Vested period:/ }),
      ).toBeInTheDocument();
      expect(
        within(timeline).getByRole("img", { name: /Unvested period:/ }),
      ).toBeInTheDocument();
      expect(
        within(timeline).getByRole("img", { name: /Cliff period:/ }),
      ).toBeInTheDocument();

      // The CSS patterns survive any filter that changes only colour.
      expect(styles).toMatch(
        /segment--cliff\s*\{\s*background:\s*repeating-linear-gradient/,
      );
      expect(styles).toMatch(
        /segment--remaining\s*\{[^}]*background-image:\s*radial-gradient/s,
      );
      expect(styles).toMatch(
        /segment--accrual\s*\{\s*background:\s*linear-gradient/,
      );
    },
  );
});
