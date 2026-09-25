import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Header, { getPeriodBoundaries } from "./Header";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

describe("Treasury Header refresh control", () => {
  it("announces completion after a manual metrics refresh", () => {
    const onRefresh = vi.fn();
    render(<Header onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh metrics" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Treasury metrics refresh completed.")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });
});

describe("Treasury Header Period Reflectivity (#1745)", () => {
  it("names the period the figures cover and states boundaries explicitly", () => {
    render(
      <Header
        selectedPeriod="30d"
        resolvedPeriod="30d"
        boundaries={{ startDate: "2026-08-26", endDate: "2026-09-25" }}
      />
    );

    expect(screen.getByTestId("figures-period-label")).toHaveTextContent(
      "Figures cover: Last 30 Days"
    );
    expect(screen.getByTestId("period-boundaries")).toHaveTextContent(
      "Boundaries: 2026-08-26 to 2026-09-25"
    );
    expect(screen.getByRole("combobox", { name: "Select treasury period" })).toHaveValue("30d");
  });

  it("updates selection immediately and calls onPeriodChange", () => {
    const onPeriodChange = vi.fn();
    render(
      <Header
        selectedPeriod="30d"
        onPeriodChange={onPeriodChange}
        resolvedPeriod="30d"
      />
    );

    const select = screen.getByRole("combobox", { name: "Select treasury period" });
    fireEvent.change(select, { target: { value: "90d" } });

    expect(onPeriodChange).toHaveBeenCalledWith("90d");
  });

  it("indicates loading before figures resolve and never labels figures from a different period", () => {
    render(
      <Header
        selectedPeriod="90d"
        resolvedPeriod="30d"
        loading={true}
        boundaries={{ startDate: "2026-08-26", endDate: "2026-09-25" }}
      />
    );

    // Header selector shows newly selected period (90d)
    expect(screen.getByRole("combobox", { name: "Select treasury period" })).toHaveValue("90d");

    // Loading indicator explicitly states loading 90d while currently showing 30d
    const loadingIndicator = screen.getByTestId("period-loading");
    expect(loadingIndicator).toHaveTextContent("Loading Last 90 Days figures...");
    expect(loadingIndicator).toHaveTextContent("(currently showing Last 30 Days)");

    // Figure label for resolvedPeriod (30d) is not mislabeled as 90d
    expect(screen.queryByText("Figures cover: Last 90 Days")).toBeNull();
  });

  it("calculates accurate period boundaries for default reference date", () => {
    const refDate = new Date("2026-09-25T00:00:00Z");
    const b7 = getPeriodBoundaries("7d", refDate);
    expect(b7).toEqual({ startDate: "2026-09-18", endDate: "2026-09-25" });

    const b30 = getPeriodBoundaries("30d", refDate);
    expect(b30).toEqual({ startDate: "2026-08-26", endDate: "2026-09-25" });

    const b90 = getPeriodBoundaries("90d", refDate);
    expect(b90).toEqual({ startDate: "2026-06-27", endDate: "2026-09-25" });
  });
});

