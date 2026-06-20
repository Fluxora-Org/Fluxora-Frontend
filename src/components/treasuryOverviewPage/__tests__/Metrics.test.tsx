import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Metrics from "../Metrics";
import { metricsData } from "../sample-streams";

describe("Metrics", () => {
  it("renders every treasury metric label and value", () => {
    render(<Metrics />);

    for (const metric of metricsData) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    }
  });

  it("renders an empty state when no metrics are available", () => {
    render(<Metrics metrics={[]} />);

    expect(screen.getByText("No metrics available")).toBeInTheDocument();
  });
});
