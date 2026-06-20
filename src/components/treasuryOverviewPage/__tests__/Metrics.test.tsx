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
});
