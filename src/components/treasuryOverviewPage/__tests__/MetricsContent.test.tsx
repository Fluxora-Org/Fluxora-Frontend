import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Metric } from "../Metric";
import { MetricsContent } from "../Metrics";

const metric: Metric = {
  icon: "icon",
  label: "Active Streams",
  value: "3",
  desc: "streams currently accruing",
};

describe("MetricsContent", () => {
  it("renders a loading state while treasury metrics load", () => {
    render(
      <MetricsContent
        metrics={[]}
        loading
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/treasury metrics/i)).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByText(/loading treasury metrics/i)).toBeInTheDocument();
  });

  it("renders an error state with retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <MetricsContent
        metrics={[]}
        loading={false}
        error="Unable to load treasury overview data."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /unable to load treasury overview data/i,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders metric cards when data is available", () => {
    render(
      <MetricsContent
        metrics={[metric]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("group", { name: /active streams/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders an empty state when no metrics are returned", () => {
    render(
      <MetricsContent
        metrics={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/no treasury metrics available/i)).toBeInTheDocument();
  });
});
