/**
 * ColorBlindSimulationProvider tests
 * ────────────────────────────────────
 * Unit tests for the context provider, SVG filter rendering,
 * useColorBlindSimulation hook, and unintentional-enable safeguards.
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ColorBlindSimulationProvider,
  ColorBlindSvgFilters,
  useColorBlindSimulation,
  SIMULATION_LABELS,
  SVG_FILTER_VALUES,
  COLORBLIND_STORAGE_KEYS,
  COLORBLIND_PERSISTENCE_POLICY,
  clearColorBlindStorageArtifacts,
  isSimulationMode,
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
      <button
        onClick={() =>
          // @ts-expect-error — guardrail test: proves the provider rejects an
          // out-of-union mode without crashing. The literal is intentionally
          // not a SimulationMode; it must be added to that union before this
          // suppression can be removed.
          setSimulation("not-a-real-mode")
        }
      >
        Set Invalid
      </button>
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

// ─── Unintentional-enable safeguards (issue #1693) ───────────────────────────

describe("colour-blind simulation cannot be left enabled unintentionally", () => {
  beforeEach(() => {
    for (const key of COLORBLIND_STORAGE_KEYS) {
      window.localStorage.setItem(key, "protanopia");
      window.sessionStorage.setItem(key, "deuteranopia");
    }
  });

  afterEach(() => {
    for (const key of COLORBLIND_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }
  });

  it("documents deliberate non-persistence across reloads", () => {
    expect(COLORBLIND_PERSISTENCE_POLICY.acrossReloads).toBe(false);
    expect(COLORBLIND_PERSISTENCE_POLICY.storage).toBe("none");
  });

  it("starts at none even when storage leftovers exist", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByTestId("mode").textContent).toBe("none");
    expect(screen.getByTestId("simulating").textContent).toBe("false");
  });

  it("clears storage leftovers on mount", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    for (const key of COLORBLIND_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
  });

  it("does not write simulation state to localStorage or sessionStorage", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    act(() => {
      screen.getByText("Set Protanopia").click();
    });
    for (const key of COLORBLIND_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
  });

  it("shows a persistent active banner while simulating", () => {
    render(
      <ColorBlindSimulationProvider initialMode="protanopia">
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByTestId("colorblind-active-banner")).toBeInTheDocument();
    expect(screen.getByTestId("colorblind-active-banner").textContent).toMatch(
      /Protanopia/i,
    );
  });

  it("hides the active banner when simulation is off", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(
      screen.queryByTestId("colorblind-active-banner"),
    ).not.toBeInTheDocument();
  });

  it("can be disabled from the sticky banner anywhere it is active", () => {
    render(
      <ColorBlindSimulationProvider initialMode="tritanopia">
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    expect(screen.getByTestId("simulating").textContent).toBe("true");
    act(() => {
      screen.getByTestId("colorblind-disable-button").click();
    });
    expect(screen.getByTestId("mode").textContent).toBe("none");
    expect(screen.getByTestId("simulating").textContent).toBe("false");
    expect(
      screen.queryByTestId("colorblind-active-banner"),
    ).not.toBeInTheDocument();
  });

  it("ignores invalid setSimulation values so enable must be deliberate", () => {
    render(
      <ColorBlindSimulationProvider>
        <SimulationDisplay />
      </ColorBlindSimulationProvider>,
    );
    act(() => {
      screen.getByText("Set Invalid").click();
    });
    expect(screen.getByTestId("mode").textContent).toBe("none");
    expect(isSimulationMode("not-a-real-mode")).toBe(false);
  });

  it("clearColorBlindStorageArtifacts removes known keys from both stores", () => {
    clearColorBlindStorageArtifacts(window.localStorage, window.sessionStorage);
    for (const key of COLORBLIND_STORAGE_KEYS) {
      expect(window.localStorage.getItem(key)).toBeNull();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
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
