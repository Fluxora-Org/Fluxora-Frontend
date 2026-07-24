/**
 * ColorBlindSimulationProvider tests
 * ────────────────────────────────────
 * Unit tests for the context provider, SVG filter rendering,
 * and useColorBlindSimulation hook.
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ColorBlindSimulationProvider,
  ColorBlindSvgFilters,
  useColorBlindSimulation,
  SIMULATION_LABELS,
  SVG_FILTER_VALUES,
  type SimulationMode,
} from "../ColorBlindSimulationProvider";

// ─── Test helper ─────────────────────────────────────────────────────────────

/** Renders a component that reads and displays simulation state. */
function SimulationDisplay() {
  const { simulation, isSimulating, setSimulation } =
    useColorBlindSimulation();
  return (
    <div>
      <span data-testid="mode">{simulation}</span>
      <span data-testid="simulating">{String(isSimulating)}</span>
      <button onClick={() => setSimulation("protanopia")}>
        Set Protanopia
      </button>
      <button onClick={() => setSimulation("none")}>Reset</button>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

describe("ColorBlindSimulationProvider", () => {
  it("renders children", () => {
    render(
      <ColorBlindSimulationProvider>
        <p>child content</p>
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("defaults to simulation=none", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("none");
    expect(screen.getByTestId("simulating").textContent).toBe("false");
  });

  it("accepts an initialMode prop", () => {
    render(
      <ColorBlindSimulationProvider initialMode="deuteranopia">
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("deuteranopia");
    expect(screen.getByTestId("simulating").textContent).toBe("true");
  });

  it("updates simulation when setSimulation is called", async () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    act(() => {
      screen.getByText("Set Protanopia").click();
    });
    expect(screen.getByTestId("mode").textContent).toBe("protanopia");
    expect(screen.getByTestId("simulating").textContent).toBe("true");
  });

  it("resets isSimulating to false when set to none", async () => {
    render(
      <ColorBlindSimulationProvider initialMode="protanopia">
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    act(() => {
      screen.getByText("Reset").click();
    });
    expect(screen.getByTestId("mode").textContent).toBe("none");
    expect(screen.getByTestId("simulating").textContent).toBe("false");
  });

  it("applies data-colorblind-simulation attribute to wrapper div", () => {
    const { container } = render(
      <ColorBlindSimulationProvider initialMode="tritanopia">
        <span>content</span>
      </ColorBlindSimulationProvider>,
    );
    const wrapper = container.querySelector(
      "[data-colorblind-simulation]",
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-colorblind-simulation")).toBe(
      "tritanopia",
    );
  });

  it("applies CSS filter style when simulating", () => {
    const { container } = render(
      <ColorBlindSimulationProvider initialMode="protanopia">
        <span>content</span>
      </ColorBlindSimulationProvider>,
    );
    const wrapper = container.querySelector(
      "[data-colorblind-simulation]",
    ) as HTMLElement;
    // jsdom normalises url() references by quoting the ID, so we check
    // that the filter references the correct filter ID regardless of quoting.
    expect(wrapper.style.filter).toContain("cb-filter-protanopia");
  });

  it("does not apply filter style when simulation is none", () => {
    const { container } = render(
      <ColorBlindSimulationProvider>
        <span>content</span>
      </ColorBlindSimulationProvider>,
    );
    const wrapper = container.querySelector(
      "[data-colorblind-simulation]",
    ) as HTMLElement;
    expect(wrapper.style.filter).toBe("");
  });
});

// ─── SVG Filter Definitions ──────────────────────────────────────────────────

describe("ColorBlindSvgFilters", () => {
  it("renders an SVG element with aria-hidden", () => {
    const { container } = render(<ColorBlindSvgFilters />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders a filter element for each simulation type", () => {
    const { container } = render(<ColorBlindSvgFilters />);
    expect(container.querySelector("#cb-filter-protanopia")).toBeTruthy();
    expect(container.querySelector("#cb-filter-deuteranopia")).toBeTruthy();
    expect(container.querySelector("#cb-filter-tritanopia")).toBeTruthy();
  });

  it("each filter contains a feColorMatrix with the correct values", () => {
    const { container } = render(<ColorBlindSvgFilters />);
    for (const [mode, values] of Object.entries(SVG_FILTER_VALUES)) {
      const filter = container.querySelector(`#cb-filter-${mode}`);
      const feColorMatrix = filter?.querySelector("feColorMatrix");
      expect(feColorMatrix).toBeTruthy();
      // Check type attribute
      expect(feColorMatrix?.getAttribute("type")).toBe("matrix");
      // The values string should be present (normalised whitespace may differ)
      const actual = feColorMatrix?.getAttribute("values") ?? "";
      // Compare numeric tokens to tolerate whitespace differences
      const normalise = (s: string) =>
        s.trim().replace(/\s+/g, " ");
      expect(normalise(actual)).toBe(normalise(values));
    }
  });
});

// ─── useColorBlindSimulation hook ────────────────────────────────────────────

describe("useColorBlindSimulation", () => {
  it("throws when used outside a provider", () => {
    // Suppress expected console.error from React
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => {
      render(<SimulationDisplay />);
    }).toThrow("useColorBlindSimulation must be used within a ColorBlindSimulationProvider");
    consoleSpy.mockRestore();
  });
});

// ─── SIMULATION_LABELS ───────────────────────────────────────────────────────

describe("SIMULATION_LABELS", () => {
  const modes: SimulationMode[] = [
    "none",
    "protanopia",
    "deuteranopia",
    "tritanopia",
  ];

  it("has a label for every mode", () => {
    for (const mode of modes) {
      expect(SIMULATION_LABELS[mode]).toBeTruthy();
      expect(typeof SIMULATION_LABELS[mode]).toBe("string");
    }
  });
});
