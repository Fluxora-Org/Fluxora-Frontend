import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
