/**
 * ColorBlindSimulationProvider
 * ──────────────────────────────
 * Context provider for the colour-blind simulation preview mode.
 *
 * This is a **developer / design-QA affordance only**. It is not intended
 * as a shipped end-user accessibility setting. The simulation injects an SVG
 * `<feColorMatrix>` filter onto a wrapping element so every descendant
 * (StatusPill, MetricCard, charts, etc.) is filtered through the chosen
 * simulation preset.
 *
 * ## Supported simulations
 * - `none`         – default view, no filter applied
 * - `protanopia`   – red-blind (no L-cones)
 * - `deuteranopia` – green-blind (no M-cones)
 * - `tritanopia`   – blue-blind (no S-cones)
 *
 * ## Usage
 * ```tsx
 * // In app root (dev/QA builds):
 * <ColorBlindSimulationProvider>
 *   <TreasuryPage />
 * </ColorBlindSimulationProvider>
 *
 * // In any descendant:
 * const { simulation, setSimulation } = useColorBlindSimulation();
 * ```
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** The supported simulation modes. `"none"` means no filter is applied. */
export type SimulationMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";

/** Human-readable labels used in toggle UI and live-region announcements. */
export const SIMULATION_LABELS: Record<SimulationMode, string> = {
  none: "No simulation",
  protanopia: "Protanopia (red-blind)",
  deuteranopia: "Deuteranopia (green-blind)",
  tritanopia: "Tritanopia (blue-blind)",
};

/**
 * SVG feColorMatrix `values` strings for each simulation type.
 *
 * These are the standard Brettel / Viénot matrices expressed in the
 * 5×4 SVG feColorMatrix format (R G B A offset, one row per channel).
 * They match the row-major 3×3 matrices in `contrastUtils.ts`.
 */
export const SVG_FILTER_VALUES: Record<
  Exclude<SimulationMode, "none">,
  string
> = {
  protanopia: [
    "0.56667  0.43333  0        0  0",
    "0.55833  0.44167  0        0  0",
    "0        0.24167  0.75833  0  0",
    "0        0        0        1  0",
  ].join(" "),
  deuteranopia: [
    "0.625  0.375  0    0  0",
    "0.7    0.3    0    0  0",
    "0      0.3    0.7  0  0",
    "0      0      0    1  0",
  ].join(" "),
  tritanopia: [
    "0.95  0.05   0      0  0",
    "0     0.433  0.567  0  0",
    "0     0.475  0.525  0  0",
    "0     0      0      1  0",
  ].join(" "),
};

// ─── Context ──────────────────────────────────────────────────────────────────

export interface ColorBlindSimulationContextValue {
  /** The currently active simulation mode. */
  simulation: SimulationMode;
  /**
   * Sets the active simulation mode.
   * Passing `"none"` removes the filter entirely.
   */
  setSimulation: (mode: SimulationMode) => void;
  /** `true` when any simulation is active (i.e. `simulation !== "none"`). */
  isSimulating: boolean;
}

const ColorBlindSimulationContext =
  createContext<ColorBlindSimulationContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ColorBlindSimulationProviderProps {
  children: ReactNode;
  /** Initial simulation mode. Defaults to `"none"`. */
  initialMode?: SimulationMode;
}

/**
 * Provides colour-blind simulation state to its subtree and renders the
 * required SVG `<filter>` definitions in the DOM.
 *
 * The provider wraps its `children` in a `<div>` whose `style.filter` is set
 * to reference the active SVG filter. The SVG definitions are rendered as an
 * off-screen element so they are available globally.
 */
export function ColorBlindSimulationProvider({
  children,
  initialMode = "none",
}: ColorBlindSimulationProviderProps) {
  const [simulation, setSimulationState] = useState<SimulationMode>(initialMode);

  const setSimulation = useCallback((mode: SimulationMode) => {
    setSimulationState(mode);
  }, []);

  const isSimulating = simulation !== "none";

  const value = useMemo<ColorBlindSimulationContextValue>(
    () => ({ simulation, setSimulation, isSimulating }),
    [simulation, setSimulation, isSimulating],
  );

  // CSS filter reference — empty string when no simulation is active.
  const filterStyle =
    isSimulating ? `url(#cb-filter-${simulation})` : undefined;

  return (
    <ColorBlindSimulationContext.Provider value={value}>
      {/* SVG filter definitions — rendered off-screen, not interactive */}
      <ColorBlindSvgFilters />

      {/*
       * Wrapping div carries the CSS filter when a simulation is active.
       * Using `isolation: isolate` prevents filter from bleeding into
       * fixed-position children (modals, tooltips) that use a portal.
       */}
      <div
        data-colorblind-simulation={simulation}
        style={
          filterStyle
            ? { filter: filterStyle, isolation: "isolate" }
            : undefined
        }
      >
        {children}
      </div>
    </ColorBlindSimulationContext.Provider>
  );
}

// ─── SVG Filter Definitions ───────────────────────────────────────────────────

/**
 * Renders the three SVG feColorMatrix filter definitions into the DOM.
 * Kept as a separate component so it can be unit-tested independently.
 */
export function ColorBlindSvgFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        // Keep out of tab order and out of layout flow entirely.
        pointerEvents: "none",
      }}
    >
      <defs>
        {(
          Object.entries(SVG_FILTER_VALUES) as [
            Exclude<SimulationMode, "none">,
            string,
          ][]
        ).map(([mode, values]) => (
          <filter key={mode} id={`cb-filter-${mode}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={values} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Accesses colour-blind simulation state.
 *
 * @throws If called outside of a {@link ColorBlindSimulationProvider}.
 */
export function useColorBlindSimulation(): ColorBlindSimulationContextValue {
  const context = useContext(ColorBlindSimulationContext);
  if (context === null) {
    throw new Error(
      "useColorBlindSimulation must be used within a ColorBlindSimulationProvider",
    );
  }
  return context;
}
