import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AccrualPreview from "../AccrualPreview";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 0, 1, 12, 0, 0);
const CLIFF = START + 30 * DAY_MS;
const END = START + 90 * DAY_MS;

describe("AccrualPreview", () => {
  it("exposes an accessible chart, text alternative and data table", () => {
    render(
      <AccrualPreview
        total={1_000_000_000n}
        startMs={START}
        cliffMs={CLIFF}
        endMs={END}
        decimals={7}
      />,
    );

    const chart = screen.getByRole("img", { name: /accrual curve/i });
    expect(chart).toBeInTheDocument();
    expect(chart).toHaveAccessibleName(/starts .*cliff .*100% on/i);

    // Text alternative is also available outside the SVG.
    expect(
      screen.getByText(/starts .*cliff .*100% on/i),
    ).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Accrual schedule")).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Progress" }),
    ).toBeInTheDocument();
    // The final row reports the full deposit.
    expect(within(table).getAllByText("100%").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("100.00").length).toBeGreaterThan(0);
  });

  it("announces streams without a cliff", () => {
    render(
      <AccrualPreview
        total={500_000_000n}
        startMs={START}
        cliffMs={null}
        endMs={END}
        decimals={7}
      />,
    );

    expect(
      screen.getByText(/starts .*no cliff, 100% on/i),
    ).toBeInTheDocument();
  });

  it("renders one table row per schedule point", () => {
    render(
      <AccrualPreview
        total={100_000_000n}
        startMs={START}
        cliffMs={null}
        endMs={END}
        decimals={7}
        segments={4}
      />,
    );

    const table = screen.getByRole("table");
    // 1 row for the start plus 4 linear segments.
    expect(within(table).getAllByRole("row")).toHaveLength(6);
  });
});
